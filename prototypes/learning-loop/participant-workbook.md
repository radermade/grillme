# Participant Workbook

Participant ID: __________  Date: __________

## 1. Baseline

An application asks a model for JSON matching this shape:

```ts
{ answer: string; confidence: number }
```

Explain how the application should handle malformed, invalid, or unsafe model output. Include what should happen after repeated failure.

Confidence, 1 to 5: ___

## 2. Focused lesson

Model output is untrusted input. Successful JSON parsing proves only that text has valid JSON syntax. The parsed value still needs runtime validation for object shape, required and unexpected keys, field types, ranges, size, and safety policy.

Recovery must be bounded. An application can request a corrected response after a validation failure, but every model call adds latency and cost and can fail again. Set a maximum attempt count, record sanitized failure categories, and return an explicit terminal error when attempts are exhausted. Do not silently accept a partial value or retry forever.

Validation and authorization are different. A structurally valid model response cannot grant permissions, invoke arbitrary tools, or bypass deterministic policy. Escape output for its destination and keep privileged decisions outside the model.

Useful operational signals include attempt count, failure category, latency, and terminal outcome. Do not log prompts, raw output, credentials, or sensitive retrieved data by default.

## 3. Grill

1. Why is `JSON.parse` insufficient for model output?
2. What should determine whether the application retries?
3. Follow-up when asked: What prevents recovery from becoming an availability or cost failure?

## 4. Scenario

A support assistant must return a short answer and confidence score. Median latency should stay below two seconds, unsafe text must not reach the UI, and each request has a strict cost ceiling.

Choose and defend one design:

- A. Parse JSON and render any returned fields. Retry until parsing succeeds.
- B. Parse, validate schema and safety, retry any failure up to two total model calls, then return a typed terminal failure.
- C. Ask the model whether its own response is safe and render it when the model says yes.

State one condition that would make you revise your choice.

## 5. Implementation

Use the browser prototype's virtual terminal to repair the simulated GenAI service configuration.

Your target behavior is:

- Exactly two total model-call attempts.
- Strict structured-output schema validation.
- Unsafe output blocked before display.
- Sanitized telemetry without raw model output.

Start with `help`, inspect the environment, change its configuration, and run `check`. Failed checks identify unmet behavior. Revise until all deterministic checks pass.

The terminal uses a fixed simulated command language. It does not execute shell commands.

## 6. Reflection

1. Explain the final design and why its retry behavior is bounded.
2. Which decisions are deterministic rather than delegated to the model?
3. Which metrics would help diagnose failures without exposing model content?
4. What uncertainty remains?

Final confidence, 1 to 5: ___