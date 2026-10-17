import assert from "node:assert/strict";
import test from "node:test";

const modulePath = process.env.EXERCISE_MODULE ?? "./starter.mjs";
const { getStructuredAnswer, StructuredOutputError } = await import(modulePath);

const sequence = (...steps) => {
  let calls = 0;
  const callModel = async () => {
    const step = steps[calls++];
    if (step instanceof Error) throw step;
    return step;
  };
  return { callModel, calls: () => calls };
};

const expectRejected = async (run, categories) => {
  await assert.rejects(run, (error) => {
    assert.ok(error instanceof StructuredOutputError);
    assert.equal(error.code, "OUTPUT_REJECTED");
    assert.deepEqual(error.categories, categories);
    return true;
  });
};

test("accepts exactly valid structured output", async () => {
  const source = sequence('{"answer":"Use bounded validation.","confidence":0.8}');
  assert.deepEqual(await getStructuredAnswer(source.callModel, 1), {
    answer: "Use bounded validation.",
    confidence: 0.8,
  });
});

test("retries malformed JSON and then succeeds", async () => {
  const source = sequence("not json", '{"answer":"Recovered.","confidence":1}');
  assert.deepEqual(await getStructuredAnswer(source.callModel, 2), {
    answer: "Recovered.",
    confidence: 1,
  });
  assert.equal(source.calls(), 2);
});

test("rejects missing, extra, and invalid fields", async () => {
  const source = sequence(
    '{"answer":"Missing confidence"}',
    '{"answer":"Extra","confidence":0.5,"admin":true}',
    '{"answer":"Bad range","confidence":2}',
  );
  await expectRejected(() => getStructuredAnswer(source.callModel, 3), ["schema", "schema", "schema"]);
});

test("rejects non-objects and non-finite confidence", async () => {
  const source = sequence("null", "[]", '{"answer":"Nope","confidence":1e400}');
  await expectRejected(() => getStructuredAnswer(source.callModel, 3), ["schema", "schema", "schema"]);
});

test("rejects empty, oversized, and unsafe answers", async () => {
  const oversized = "a".repeat(201);
  const source = sequence(
    '{"answer":"   ","confidence":0.2}',
    JSON.stringify({ answer: oversized, confidence: 0.4 }),
    '{"answer":"JaVaScRiPt:alert(1)","confidence":0.6}',
  );
  await expectRejected(() => getStructuredAnswer(source.callModel, 3), ["schema", "schema", "safety"]);
});

test("categorizes model failures and never exceeds the attempt limit", async () => {
  const secret = "sensitive raw output";
  const source = sequence(new Error("network details"), secret, '{"answer":"unused","confidence":1}');
  await assert.rejects(() => getStructuredAnswer(source.callModel, 2), (error) => {
    assert.deepEqual(error.categories, ["model", "parse"]);
    assert.equal(error.message.includes(secret), false);
    assert.equal(error.message.includes("network details"), false);
    return true;
  });
  assert.equal(source.calls(), 2);
});

test("rejects an invalid attempt policy without calling the model", async () => {
  for (const maxAttempts of [0, 4, 1.5, Number.NaN]) {
    const source = sequence('{"answer":"unused","confidence":1}');
    await assert.rejects(() => getStructuredAnswer(source.callModel, maxAttempts), RangeError);
    assert.equal(source.calls(), 0);
  }
});