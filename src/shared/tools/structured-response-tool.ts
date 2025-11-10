/**
 * @file src/shared/tools/structured-response-tool.ts
 * @description Structured response tool for schema-enforced JSON output from LLMs
 */

import type { ZodObject, ZodSchema, z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Env } from "../../config/env";
import type { StructuredModel, StructuredResponse } from "./types";
import { Hermes2Pro, Llama3_3, Llama4Scout, MistralSmall3_1 } from "./types";

/**
 * @class StructuredResponseTool
 * @description Provides a high-level API to force LLM output into a
 * Zod-defined schema.
 *
 * This class is the core of reliable, agentic JSON-based workflows. It manages:
 * - Converting Zod schemas to JSON Schemas for the model.
 * - Calling models using native Cloudflare AI JSON Mode.
 * - Automatic model selection based on text size (e.g., large-context vs. small).
 * - Automatic model fallback (tries multiple models on failure).
 * - Automatic text chunking and result merging for payloads exceeding context limits.
 * - Default value filling to ensure schema compliance even if the AI omits fields.
 *
 * @example
 * // In a Worker:
 * const { z } = import "zod";
 * const structuredTool = new StructuredResponseTool(env);
 *
 * const userSchema = z.object({
 * name: z.string().describe("The user's full name"),
 * age: z.number().optional().describe("The user's age"),
 * email: z.string().email().describe("The user's email address")
 * });
 *
 * const text = "My name is Jane Doe, my email is jane@example.com and I'm 30.";
 *
 * const response = await structuredTool.analyzeText(userSchema, text);
 *
 * if (response.success) {
 * console.log(response.structuredResult.name); // "Jane Doe"
 * console.log(response.structuredResult.email); // "jane@example.com"
 * } else {
 * console.error(response.error);
 * }
 */
export class StructuredResponseTool {
  private env: Env;

  /**
   * @property {number} maxSmallContextChars
   * @description Character limit to determine if a text payload is "large".
   * If `textPayload.length > maxSmallContextChars`, the tool will
   * prioritize large-context models (Llama4, Mistral) or chunking.
   * @default 80000
   */
  private maxSmallContextChars: number = 80000;

  /**
   * @constructor
   * @param {Env} env - The Cloudflare Worker environment object, which must
   * contain the `AI` binding.
   */
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * @private
   * @method fillMissingFields
   * @description Pre-parses an AI's JSON response and fills in missing
   * fields with schema-appropriate default values (e.g., `[]` for arrays,
   * `""` for strings).
   *
   * This is a crucial robustness feature. LLMs often omit fields that are
   * `null` or empty (like an empty `tags: []` array). This method
   * prevents Zod validation from failing by ensuring every field
   * defined in the schema is present before the final parse.
   *
   * @template T - A ZodObject schema.
   * @param {T} schema - The Zod schema to enforce.
   * @param {any} aiResponse - The raw, partial JSON object from the AI.
   * @returns {z.infer<T>} A new object with all fields present.
   * @throws {Error} Throws a Zod validation error if the final,
   * filled object *still* doesn't match the schema (e.g., wrong data type).
   */
  private fillMissingFields<T extends ZodObject<any>>(
    schema: T,
    aiResponse: any
  ): z.infer<T> {
    const fullResponse: any = { ...aiResponse };
    const properties = schema.shape as Record<string, ZodSchema<any>>;

    // Iterate over all keys defined in the Zod schema
    for (const key in properties) {
      // If the AI's response doesn't have the key, add it.
      if (!(key in fullResponse) || fullResponse[key] === undefined) {
        const zodType = properties[key];

        // Assign a default value based on the Zod type.
        if (zodType._def?.typeName === "ZodArray") {
          fullResponse[key] = [];
        } else if (zodType._def?.typeName === "ZodObject") {
          fullResponse[key] = {};
        } else if (zodType._def?.typeName === "ZodString") {
          fullResponse[key] = "";
        } else if (zodType._def?.typeName === "ZodNumber") {
          fullResponse[key] = 0;
        } else if (zodType._def?.typeName === "ZodBoolean") {
          fullResponse[key] = false;
        } else {
          // For optional, nullable, or complex types, default to null.
          fullResponse[key] = null;
        }
      }
    }

    // Perform the final validation parse. This will throw if the AI
    // provided a *wrong* type (e.g., string for number).
    return schema.parse(fullResponse);
  }

  /**
   * @private
   * @method executeModel
   * @description The core internal function that executes a single request
   * against a specific model using Cloudflare's native JSON Mode.
   *
   * @template T - A ZodObject schema.
   * @param {StructuredModel} modelName - The identifier of the model to run.
   * @param {string} text - The text payload to analyze.
   * @param {T} schema - The Zod schema for the expected output.
   * @param {boolean} [isChunk=false] - A flag to pass through to the
   * final `StructuredResponse` object.
   * @returns {Promise<StructuredResponse<z.infer<T>>>} The structured response.
   */
  private async executeModel<T extends ZodObject<any>>(
    modelName: StructuredModel,
    text: string,
    schema: T,
    isChunk: boolean = false
  ): Promise<StructuredResponse<z.infer<T>>> {
    try {
      // 1. Convert the Zod schema to a JSON Schema specification.
      //    `$refStrategy: "none"` ensures the entire schema is inlined,
      //    which is required by the AI model.
      const jsonSchema = zodToJsonSchema(schema, { $refStrategy: "none" });

      // 2. Clean up the JSON Schema.
      //    `zodToJsonSchema` adds a `$schema` key that Workers AI doesn't need.
      if (
        jsonSchema &&
        typeof jsonSchema === "object" &&
        "$schema" in jsonSchema
      ) {
        delete (jsonSchema as any).$schema;
      }

      // 3. Define the prompt for the model.
      const prompt = `Analyze the provided TEXT and conform your output strictly to the JSON structure required by the schema. Only output the JSON object, no additional text or formatting.

TEXT: "${text}"

Please respond with valid JSON that matches the expected schema structure.`;

      // 4. Call the Workers AI binding with JSON Mode enabled.
      const response = await this.env.AI.run(modelName, {
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that analyzes text and returns structured JSON responses according to the provided schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        // This is the key to native JSON Mode.
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
      });

      // 5. Extract the response.
      //    The AI binding returns the JSON object in the `response` property.
      const resultObject = response?.response || response;

      // 6. Fill missing fields and validate.
      const validatedResponse = this.fillMissingFields(schema, resultObject);

      // 7. Return the standard success response.
      return {
        success: true,
        modelUsed: modelName,
        structuredResult: validatedResponse,
        isChunked: isChunk,
      };
    } catch (e: any) {
      // 8. Return the standard error response.
      return {
        success: false,
        modelUsed: modelName,
        structuredResult: null,
        error: `Model ${modelName} failed: ${e.message || String(e)}`,
        isChunked: isChunk,
      };
    }
  }

  /**
   * @private
   * @method chunkAndMerge
   * @description A fallback strategy for handling text payloads that are
   * too large for even large-context models, or if those models fail.
   *
   * It works by:
   * 1. Splitting the `fullText` into chunks based on `maxSmallContextChars`.
   * 2. Running `executeModel` on each chunk individually.
   * 3. Merging the resulting JSON objects from each chunk.
   *
   * **Merge Logic:**
   * - **Arrays:** Concatenated.
   * - **Objects:** Shallow-merged (properties from later chunks overwrite earlier ones).
   * - **Primitives:** Overwritten (last chunk wins).
   *
   * @template T - A ZodObject schema.
   * @param {typeof Llama4Scout | typeof MistralSmall3_1} modelName - The model to use.
   * @param {string} fullText - The complete, large text payload.
   * @param {T} schema - The Zod schema.
   * @returns {Promise<StructuredResponse<z.infer<T>>>} The merged structured response.
   */
  private async chunkAndMerge<T extends ZodObject<any>>(
    modelName: typeof Llama4Scout | typeof MistralSmall3_1,
    fullText: string,
    schema: T
  ): Promise<StructuredResponse<z.infer<T>>> {
    const chunkSize = this.maxSmallContextChars;
    const textChunks: string[] = [];

    // 1. Split text into chunks.
    for (let i = 0; i < fullText.length; i += chunkSize) {
      textChunks.push(fullText.substring(i, i + chunkSize));
    }

    const mergedResults: Record<string, any> = {};

    // 2. Process each chunk.
    for (let i = 0; i < textChunks.length; i++) {
      const result = await this.executeModel(
        modelName,
        textChunks[i],
        schema,
        true // Mark as chunked
      );

      // If any chunk fails, the whole operation fails.
      if (!result.success || !result.structuredResult) {
        return {
          success: false,
          modelUsed: modelName,
          structuredResult: null,
          error: `Chunking failure on chunk ${i + 1}/${textChunks.length}: ${
            result.error
          }`,
          isChunked: true,
        };
      }

      const currentResult = result.structuredResult;

      // 3. Perform the merge.
      for (const key in currentResult) {
        const value = currentResult[key as keyof typeof currentResult];

        if (Array.isArray(value)) {
          // Concatenate arrays
          mergedResults[key] = mergedResults[key]
            ? [...mergedResults[key], ...value]
            : value;
        } else if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          // Merge objects
          mergedResults[key] = { ...mergedResults[key], ...value };
        } else if (value !== null && value !== undefined) {
          // Overwrite primitives
          mergedResults[key] = value;
        }
      }
    }

    // 4. Validate the final merged object.
    const validatedFinal = this.fillMissingFields(schema, mergedResults);

    return {
      success: true,
      modelUsed: modelName,
      structuredResult: validatedFinal,
      isChunked: true,
    };
  }

  /**
   * @public
   * @method analyzeText
   * @description The primary public method for this class. Analyzes a text
   * payload and returns a schema-enforced JSON object.
   *
   * This method contains the main routing and fallback logic:
   * 1. **Large Text:** If text > `maxSmallContextChars`:
   * - Try `Llama4Scout`.
   * - On failure, try `MistralSmall3_1`.
   * - On failure, fall back to `chunkAndMerge` with `Llama4Scout`.
   * 2. **Small Text:**
   * - Try `Hermes2Pro` (fastest).
   * - On failure, try `MistralSmall3_1`.
   * - On failure, try `Llama4Scout`.
   * - On failure, try `Llama3_3`.
   * 3. If all attempts fail, return a final error response.
   *
   * @template T - A ZodObject schema.
   * @param {T} schema - The Zod schema for the expected output.
   * @param {string} textPayload - The input text to analyze.
   * @returns {Promise<StructuredResponse<z.infer<T>>>} The structured response.
   */
  public async analyzeText<T extends ZodObject<any>>(
    schema: T,
    textPayload: string
  ): Promise<StructuredResponse<z.infer<T>>> {
    const textCharLength = textPayload.length;

    if (textCharLength > this.maxSmallContextChars) {
      // --- Large Text Strategy ---
      let result = await this.executeModel(Llama4Scout, textPayload, schema);
      if (result.success) return result;

      result = await this.executeModel(MistralSmall3_1, textPayload, schema);
      if (result.success) return result;

      // Fallback to chunking
      return this.chunkAndMerge(Llama4Scout, textPayload, schema);
    } else {
      // --- Small Text Strategy (Prioritizes speed) ---
      let result = await this.executeModel(Hermes2Pro, textPayload, schema);
      if (result.success) return result;

      result = await this.executeModel(MistralSmall3_1, textPayload, schema);
      if (result.success) return result;

      result = await this.executeModel(Llama4Scout, textPayload, schema);
      if (result.success) return result;

      result = await this.executeModel(Llama3_3, textPayload, schema);
      if (result.success) return result;

      // --- All models failed ---
      return {
        success: false,
        modelUsed: Llama3_3, // Reports the last model tried
        structuredResult: null,
        error: "All models failed to generate a valid structured response.",
      };
    }
  }

  /**
   * @public
   * @method analyzeTextWithModel
   * @description Bypasses the automatic selection and fallback logic to run
   * analysis with one specific model.
   *
   * This is primarily useful for:
   * - Testing a specific model's performance or compliance.
   * - Debugging a failing model.
   * - Workflows that require a specific model for consistency.
   *
   * @template T - A ZodObject schema.
   * @param {T} schema - The Zod schema.
   * @param {string} textPayload - The input text.
   * @param {StructuredModel} modelName - The specific model to use.
   * @returns {Promise<StructuredResponse<z.infer<T>>>} The structured response.
   */
  public async analyzeTextWithModel<T extends ZodObject<any>>(
    schema: T,
    textPayload: string,
    modelName: StructuredModel
  ): Promise<StructuredResponse<z.infer<T>>> {
    return this.executeModel(modelName, textPayload, schema);
  }

  /**
   * @public
   * @method getAvailableModels
   * @description Returns a list of all model identifiers supported by this tool.
   * @returns {StructuredModel[]} An array of model ID strings.
   */
  public getAvailableModels(): StructuredModel[] {
    return [Llama4Scout, MistralSmall3_1, Hermes2Pro, Llama3_3];
  }
}

/**
 * @function createStructuredResponseTool
 * @description Factory function to create a new instance of `StructuredResponseTool`.
 * @param {Env} env - The Cloudflare Worker environment bindings.
 * @returns {StructuredResponseTool} A new StructuredResponseTool instance.
 */
export function createStructuredResponseTool(env: Env): StructuredResponseTool {
  return new StructuredResponseTool(env);
}
