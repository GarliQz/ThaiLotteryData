import fs from 'fs-extra';
import path from 'path';
import Ajv, { JSONSchemaType } from 'ajv';

// Define TypeScript interface for validation
interface LotteryResponse {
    statusMessage: string;
    statusCode: number;
    response: {
        result: {
            date: string;
            data: Record<string, { price: string; number: { round: number; value: string }[] }>;
        };
    };
}

// Define JSON schema for validation
const schema = {
    type: 'object',
    properties: {
        statusMessage: { type: 'string' },
        statusCode: { type: 'number' },
        response: {
            type: 'object',
            properties: {
                result: {
                    type: 'object',
                    properties: {
                        date: { type: 'string' },
                        data: {
                            type: 'object',
                            additionalProperties: {
                                type: 'object',
                                properties: {
                                    price: { type: 'string' },
                                    number: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                round: { type: 'number' },
                                                value: { type: 'string' }
                                            },
                                            required: ['round', 'value']
                                        }
                                    }
                                },
                                required: ['price', 'number']
                            }
                        }
                    },
                    required: ['date', 'data']
                }
            },
            required: ['result']
        }
    },
    required: ['statusMessage', 'statusCode', 'response']
};

// Function to validate JSON
const validateJson = (jsonData: any): jsonData is LotteryResponse => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    return validate(jsonData);
};

// Function to transform JSON
const transformJson = (jsonData: LotteryResponse) => {
    return {
        lotteryDate: jsonData.response.result.date,
        prizes: Object.entries(jsonData.response.result.data).map(([category, prize]) => ({
            category,
            price: prize.price,
            numbers: prize.number.map(n => ({ round: n.round, value: n.value }))
        }))
    };
};

// Folder paths
const inputDir = './data/json'; // Folder containing raw JSON files
const outputDir = './transformed_json'; // Folder for transformed JSON files

// Ensure output directory exists
fs.ensureDirSync(outputDir);

// Process all JSON files in the input directory
fs.readdir(inputDir)
    .then((files) => {
        const jsonFiles = files.filter((file) => file.endsWith('.json'));

        jsonFiles.forEach(async (file) => {
            const filePath = path.join(inputDir, file);
            const outputFilePath = path.join(outputDir, file);

            try {
                const data = await fs.readJson(filePath);
                if (validateJson(data)) {
                    const transformedData = transformJson(data);
                    await fs.writeJson(outputFilePath, transformedData, { spaces: 2 });
                    console.log(`✅ Transformed: ${file}`);
                } else {
                    console.error(`❌ Invalid JSON format: ${file}`);
                }
            } catch (err) {
                console.error(`⚠️ Error processing ${file}:`, err);
            }
        });
    })
    .catch((err) => console.error('⚠️ Error reading directory:', err));