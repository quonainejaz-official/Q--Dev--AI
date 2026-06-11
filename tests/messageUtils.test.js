describe("message utils", () => {
  test("validateMessage rejects empty input", () => {
    const { validateMessage } = require("../src/utils/messageUtils");
    const result = validateMessage("   ");
    expect(result.valid).toBe(false);
  });

  test("sanitizeMessage escapes unsafe characters", () => {
    const { sanitizeMessage } = require("../src/utils/messageUtils");
    const sanitized = sanitizeMessage("<script>alert(1)</script>");
    expect(sanitized).toBe("&lt;script&gt;alert(1)&lt;&#x2F;script&gt;");
  });

  test("buildConversationInput maps history to inputs", () => {
    const { buildConversationInput } = require("../src/utils/messageUtils");
    const history = [
      { role: "user", content: "Hi" },
      { role: "bot", content: "Hello" },
      { role: "user", content: "How are you?" }
    ];
    const input = buildConversationInput(history, "Next");
    expect(input.past_user_inputs).toEqual(["Hi", "How are you?"]);
    expect(input.generated_responses).toEqual(["Hello"]);
    expect(input.text).toBe("Next");
  });

  describe("validateMessage limits", () => {
    const originalMaxMessageLength = process.env.MAX_MESSAGE_LENGTH;

    beforeEach(() => {
      jest.resetModules();
      process.env.MAX_MESSAGE_LENGTH = "1000000";
    });

    afterAll(() => {
      if (originalMaxMessageLength === undefined) {
        delete process.env.MAX_MESSAGE_LENGTH;
      } else {
        process.env.MAX_MESSAGE_LENGTH = originalMaxMessageLength;
      }
    });

    test("validateMessage rejects more than 5000 lines", () => {
      const { validateMessage } = require("../src/utils/messageUtils");
      const message = Array.from({ length: 5001 }, () => "x").join("\n");
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
    });

    test("validateMessage rejects more than 50000 words", () => {
      const { validateMessage } = require("../src/utils/messageUtils");
      const message = `${"w ".repeat(50000)}w`;
      const result = validateMessage(message);
      expect(result.valid).toBe(false);
    });
  });
});
