import axios from 'axios';
import { initialWrite } from './jupyter';

function preprocess(input: string): string {
  return input;
}

function postprocess(result: any): any {
  return result;
}

export async function generateCode(input: string, endpoint: string): Promise<void> {
  try {
    // Preprocess the input
    const preprocessedInput = preprocess(input);

    // Post the preprocessed input to the endpoint
    const response = await axios.post(endpoint, { input: preprocessedInput });

    // Get the result from the response
    const result = response.data.result;

    // Postprocess the result
    const postprocessedResult = postprocess(result);

    // Call the initialWrite function with the output
    initialWrite(postprocessedResult);
  } catch (error) {
    console.error('Error:', error);
  }
}