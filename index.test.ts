import { describe, expect, it } from "vitest";
import {
	createGenerateContext,
	extractGenerateResponseText,
	extractJSONArray,
	parseGeneratedOptions,
	selectGenerateModels,
} from "./index.js";

describe("selectGenerateModels", () => {
	const configured = { provider: "anthropic", id: "claude-haiku-4-5" };
	const current = { provider: "openai", id: "gpt-5.4" };
	const available = [
		{ provider: "google", id: "gemini-2.5-flash" },
		{ provider: "openai", id: "gpt-4.1-mini" },
	];

	it("uses the configured model first and current model as fallback", () => {
		const result = selectGenerateModels(configured, current, available);
		expect(result).toEqual({ primary: configured, fallback: current });
	});

	it("uses the current model when no configured model is set", () => {
		const result = selectGenerateModels(null, current, available);
		expect(result).toEqual({ primary: current, fallback: null });
	});

	it("uses the preferred available model when neither configured nor current is set", () => {
		const result = selectGenerateModels(null, null, available);
		expect(result).toEqual({ primary: available[0], fallback: null });
	});

	it("does not set a fallback when configured and current are the same model", () => {
		const result = selectGenerateModels(configured, configured, available);
		expect(result).toEqual({ primary: configured, fallback: null });
	});
});

describe("extractGenerateResponseText", () => {
	it("surfaces provider errors instead of reporting an empty response", () => {
		expect(() =>
			extractGenerateResponseText("anthropic/claude-haiku-4-5", {
				stopReason: "error",
				errorMessage: "You have exceeded your Anthropic usage limit",
				content: [],
			}),
		).toThrow("anthropic/claude-haiku-4-5: You have exceeded your Anthropic usage limit");
	});

	it("throws when the model returns no text blocks", () => {
		expect(() =>
			extractGenerateResponseText("openai/gpt-5.4", {
				stopReason: "stop",
				errorMessage: undefined,
				content: [],
			}),
		).toThrow("openai/gpt-5.4 returned no text response");
	});
});

describe("extractJSONArray", () => {
	it("keeps brackets inside quoted strings while extracting the array", () => {
		const text = 'Here you go: ["React [recommended]", "Vue"] trailing note';
		expect(extractJSONArray(text)).toBe('["React [recommended]", "Vue"]');
	});
});

describe("createGenerateContext", () => {
	it("always includes a non-empty system prompt for providers that require instructions", () => {
		const context = createGenerateContext("Review these options");
		expect(context.systemPrompt).toContain("Return only a JSON array of strings");
		expect(context.messages[0].content[0].text).toBe("Review these options");
	});
});

describe("parseGeneratedOptions", () => {
	it("trims valid strings and drops empty items", () => {
		expect(parseGeneratedOptions('[" React ", "", "Vue"]')).toEqual(["React", "Vue"]);
	});

	it("preserves the parse error context", () => {
		expect(() => parseGeneratedOptions('not json')).toThrow("Failed to parse generated options:");
	});
});
