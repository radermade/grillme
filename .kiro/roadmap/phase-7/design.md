# Phase 7 Design

Status: restricted-operation broker and credential lifecycle locally complete; AWS deployment and production-like labs pending
Last reviewed: 2026-10-17

The locally verifiable design brokers restricted AWS operations through the control plane. Provider credentials never cross the server boundary. Clients receive only a public credential-lease summary and sanitized operation receipts. This is stricter than placing temporary credentials in client secure storage and preserves revocation and spend enforcement for every operation.

`AwsLabPolicy` is public constraint metadata. Private provider handles, role configuration, account assignment, credentials, validators, and cleanup authority remain server-side. The provider adapter creates and revokes leases and performs typed operations; the service rechecks all constraints before delegating.

The isolation model remains a deployment decision requiring security and cost approval. Contracts support dedicated-account-per-session and shared-account tag isolation, but no production model is selected by this engineering slice. Real STS, Organizations/account vending, IAM boundaries, CloudTrail, budgets, resource inventory, and two production-like labs remain deployment work.
