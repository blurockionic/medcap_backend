import {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ExtractPDFParams,
    ExtractElementType,
    ExtractPDFJob,
    ExtractPDFResult
} from "@adobe/pdfservices-node-sdk";
import AdmZip from "adm-zip";
import { Readable } from "stream";

// Function to extract text from PDF using Adobe PDF Services API
async function extractTextFromPDF(pdfBuffer) {
    let readStream;
    try {
        // Initial setup, create credentials instance
        const credentials = new ServicePrincipalCredentials({
            clientId: process.env.PDF_SERVICES_CLIENT_ID,
            clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
        });

        // Creates a PDF Services instance
        const pdfServices = new PDFServices({ credentials });

        // Convert the Buffer to a Readable Stream
        readStream = new Readable();
        readStream._read = () => {};
        readStream.push(pdfBuffer);
        readStream.push(null); // End the stream

        // Creates an asset from the provided readable stream
        const inputAsset = await pdfServices.upload({
            readStream,
            mimeType: MimeType.PDF
        });

        // Create parameters for the job with supported elements only
        const params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT, ExtractElementType.TABLES],
            includeStyling: true,
            ocr: true
        });

        // Creates a new job instance
        const job = new ExtractPDFJob({ inputAsset, params });

        // Submit the job and get the job result
        const pollingURL = await pdfServices.submit({ job });
        const pdfServicesResponse = await pdfServices.getJobResult({
            pollingURL,
            resultType: ExtractPDFResult
        });

        // Get content from the resulting asset(s) directly into a buffer
        const resultAsset = pdfServicesResponse.result.resource;
        const streamAsset = await pdfServices.getContent({ asset: resultAsset });

        // Collect the stream data in memory
        const bufferArray = [];
        for await (const chunk of streamAsset.readStream) {
            bufferArray.push(chunk);
        }
        const zipBuffer = Buffer.concat(bufferArray);

        // Use AdmZip to handle the zip file content from memory
        const zip = new AdmZip(zipBuffer);
        const jsonData = zip.readAsText('structuredData.json');
        const data = JSON.parse(jsonData);

        // Extract relevant text (e.g., headers and paragraphs)
        let extractedText = '';
        data.elements.forEach(element => {
            if (element.Path.endsWith('/H1') || element.Path.endsWith('/P')) {
                extractedText += element.Text + '\n';
            }
        });

        return extractedText;

    } catch (err) {
        console.error("Error extracting text from PDF:", err);
        throw new Error("Failed to extract text from PDF");
    } finally {
        readStream?.destroy();
    }
}

export default extractTextFromPDF;
