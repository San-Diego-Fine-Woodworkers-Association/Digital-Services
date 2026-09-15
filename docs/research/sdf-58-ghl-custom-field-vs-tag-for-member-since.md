# SDF-58: GHL Custom Field vs Tag for `member-since`

Should `member-since` (earliest membership `CreateDate`, currently `proclass_users.member_since`) be pushed to GoHighLevel as a **custom field of type Date** instead of, or in addition to, a plain `key: value` tag — so staff can segment contacts by date range (e.g. "member for 5+ years")?

Research method note: GHL's official docs are AI-summarized per-page here (via WebFetch), not read as raw HTML/OpenAPI spec. Where a page's summary was thin or a claim could only be corroborated by GHL's own community/ideas portal rather than `docs`/`help`, that is flagged explicitly as lower-confidence below.

---

## 1. Does GHL's contact filter/segment UI support date-range filtering on a custom field of type Date?

**Yes — confirmed via the official GHL Support Portal.** The article "Advanced Filters in Smart Lists" documents that each Smart List filter is built as `field + operator + value`, and the operator set depends on the field's data type. For date-type fields it lists an extensive operator set organized under these headings:

- **Relative Date Filters**: Is → Today / Tomorrow / Yesterday / This Week / This Month / This Quarter / This Year
- **Exact Date Filters**: Is → On, Is → Between
- **Time Difference (Relative Duration) Filters**: Is → More Than, Is → Less Than, Is → In the Next, Is → In the Last
- **Date Comparison Filters**: Is → After Date, Is → Before Date
- **Negative Filters**: "Is Not" variants of the above
- **Empty/Not Empty Filters**: Is Empty, Is Not Empty

Critically, the same article states that "any new custom field created with" a date type follows the same parameters as built-in date fields — i.e. **these operators apply to custom Date fields, not just built-in ones.**

(Source: https://help.gohighlevel.com/support/solutions/articles/155000007530-advanced-filters-in-smart-lists, "Advanced Filters in Smart Lists" / date field operator sections)

This directly satisfies the SDF-58 use case: "member for over 5 years" maps cleanly to **Is → More Than** (or **In the Last**, inverted) against a Date custom field holding `member_since`.

A related, older support article ("How to Create and Use Custom Fields within HighLevel") separately confirms Date Picker is a standard, creatable custom field type, and that custom fields generally exist to "Segment contacts easily: Create Smart Lists or filter workflows based on custom field data," but does not itself enumerate date operators — the Advanced Filters article above is the authoritative source for the operator list.

(Source: https://help.gohighlevel.com/support/solutions/articles/48001161579-how-to-use-custom-fields, "What types of fields can I create?" / "Key Benefits of Custom Fields")

---

## 2. Custom field types, and the v2 API for creating/reading/setting them

**Supported data types** (from the Custom Fields v2 API overview and the Create Custom Field endpoint's `dataType` enum): `TEXT`, `LARGE_TEXT`, `NUMERICAL`, `PHONE`, `MONETARY`, `CHECKBOX`, `SINGLE_OPTIONS`, `MULTIPLE_OPTIONS`, `RADIO`, `DATE`, `TEXTBOX_LIST`, `FILE_UPLOAD`, `SIGNATURE`. `DATE` is a confirmed, first-class type.

(Source: https://marketplace.gohighlevel.com/docs/ghl/locations/create-custom-field/, request-body `dataType` enum; corroborated by https://marketplace.gohighlevel.com/docs/ghl/custom-fields/custom-fields-v-2/index.html, overview text: "text, numeric, selection options and special fields like date/time or signature")

**Creating a custom field (v2 API):**
- `POST /locations/:locationId/customFields`
- Path param: `locationId` (required)
- Body includes: `name` (required), `dataType` (required, e.g. `"DATE"`), `model` (required: `"contact"` or `"opportunity"`), plus type-specific options (`placeholder`, `acceptedFormat`, `textBoxListOptions`, `position`, etc.)
- Response: 201, returns the created `customField` object including its assigned `id` and `fieldKey`.
- Auth: standard GHL v2 OAuth 2.0 bearer token (Access Token generated for a Sub-Account user type, or a Private Integration Token scoped to the sub-account) — the exact scope name was not visible in the fetched page excerpt; confirm the specific scope string (likely `locations/customFields.write`) when implementing.

(Source: https://marketplace.gohighlevel.com/docs/ghl/locations/create-custom-field/, request/response schema)

**Listing existing custom fields:** `GET` under "Get Custom Fields By Object Key" / the "Get Custom Fields" endpoint, used to discover a field's `id`/`fieldKey` before referencing it elsewhere.

(Source: https://marketplace.gohighlevel.com/docs/ghl/custom-fields/custom-fields-v-2/index.html, endpoint list: "Get Custom Fields By Object Key"; https://marketplace.gohighlevel.com/docs/ghl/locations/get-custom-fields/)

**Setting a custom field's value on a contact — same call as the existing upsert used for tags:**

The `POST /contacts/upsert` endpoint's request body accepts both a `tags` field (`string[]`) and a `customFields` field (`object[]`, each item `{id or key, value}`) **in the same payload**. This means the pipeline's existing one-upsert-per-contact-per-sync-run call can set `member_since` as a custom field value alongside its tags — **no separate API call is required.**

One important behavioral asymmetry to design around: the doc explicitly warns that the `tags` array in an upsert call **overwrites** all of the contact's existing tags (GHL recommends the separate Add Tag/Remove Tag endpoints for additive tag updates) — this is presumably why the existing pipeline already handles tags additively out-of-band from `tags` field semantics. `customFields` does not carry this same overwrite warning in the fetched excerpt; each entry updates that specific field by id/key rather than replacing the whole field set, so it should be safe to include `customFields` in the same upsert call without needing to fetch-then-merge all custom fields (only the `member_since` entry need be included). Worth a quick smoke test before relying on this in production, since the full overwrite-semantics text for `customFields` was not fully visible in the fetched excerpt.

(Source: https://marketplace.gohighlevel.com/docs/ghl/contacts/upsert-contact/, request body schema — `tags: string[]`, `customFields: object[]`, and tags-overwrite warning: "This field will overwrite all current tags associated with the contact. To update a tags, it is recommended to use the Add Tag or Remove Tag API instead.")

---

## 3. Do tags support any date-range-like segmentation?

**No — confirmed absent, both from what the docs positively describe and from GHL's own feature-request backlog.**

- The Advanced Filters in Smart Lists article's date operators (section 1 above) attach to **date-type fields**, not tags. A tag is a plain string; Smart List tag filters are exact/contains match only.
- Smart Lists can combine a tag filter with the contact's own `Date Added`/`Date Updated` field (e.g. "Tag = X AND Date Added = Last 30 Days"), but this filters on when the **contact record** was created/updated, not on when a specific **tag** was applied — it does not give "member for 5+ years" semantics for a tag that was added at an arbitrary later date.
- GHL's own product-feedback/ideas portal (`ideas.gohighlevel.com`, an official first-party GHL properties, though not the docs/help sites — flagged as **lower-confidence secondary-but-first-party evidence**) has an open, 113-vote feature request titled "Filter Tags By Date Tagged," whose description states GHL Support confirmed no such filter currently exists ("It would be great to have a filter for when a tag was applied in a date range. Currently that doesn't exist per support."). A related merged request asks for the same capability. This corroborates, from GHL's own side, that there is no native "tag added N days/years ago" filter.

(Source: https://help.gohighlevel.com/support/solutions/articles/155000007530-advanced-filters-in-smart-lists, date operator sections vs. tag filter description; Source: https://ideas.gohighlevel.com/contacts/p/filter-for-contacts-who-had-a-tag-added-in-a-specific-date-range, request body — **lower confidence, GHL ideas/feedback portal, not docs/help**)

**Workaround pattern that does exist (workflow automation, not native filtering):** time-based workflow automations can tag a contact once a relative time condition is met (e.g. a workflow with a wait step, or "date is X days from trigger" logic, tags the contact `member since: 5+ years` at the moment that becomes true). This effectively produces the bucketed-tag design (option d in Bottom Line) but requires either the sync pipeline itself to compute the bucket and emit a bucketed tag each run (simplest, no GHL workflow needed), or a native GHL workflow re-evaluating dates on a recurring trigger (more moving parts, not verified as directly configurable against an arbitrary stored date field without an intermediate "days since X" trigger — not confirmed against docs, **flagged as unverified/lower-confidence design option**, not required since the pipeline already computes `member_since` server-side and can just emit the bucket tag directly).

---

## 4. Rate limits, plan-tier gating, and field-count limits

**API rate limits:** GHL's official v2 API rate limits are **100 requests per 10 seconds (burst)** and **200,000 requests per day**, scoped per Marketplace app (client) per Location/Company. The rate-limits doc does not describe any distinct/higher/lower limit for custom-field endpoints versus contact/tag endpoints — the limit is uniform across all v2 OAuth-authenticated endpoints for a given app+location pair. This means adding a `customFields` entry to the existing upsert call (section 2) costs **nothing extra** in request-count terms versus a separate call, which would count as an additional request against the same budget.

(Source: https://marketplace.gohighlevel.com/docs/other/rate-limits/, "Rate Limits" — burst/daily figures)

**Custom field count limits:** Could not find, on official docs, an explicit maximum on the number of standard Contact custom fields per location/sub-account. Note there IS a distinct, unrelated GHL feature called **Custom Objects** (a different, newer entity-modeling feature, not standard Contact custom fields) that is capped at 10 Custom Objects per location with 10 unique fields per object as of an October 2025 release — this limit does **not** apply to ordinary Contact custom fields like the one this ticket would add, and should not be confused with it. Adding one Date custom field for `member_since` is very unlikely to approach any practical field-count ceiling, but no authoritative number for plain custom fields was found; **flagged as unverified — not confirmed either way from official docs**, worth a quick check in the SDFWA GHL sub-account's Settings → Custom Fields UI if this becomes a concern in practice.

(Source: https://help.gohighlevel.com/support/solutions/articles/155000006631-custom-objects-in-all-plans-higher-limit, "Custom Objects In All Plans + Higher Limit" — Custom Objects limit, explicitly a different feature from Contact custom fields)

**Plan-tier gating:** No evidence found, official or otherwise, that the Date custom field type (or custom fields generally) is gated to a specific GHL plan tier — Custom Fields (including Date) appear to be a base CRM feature available across plans. Custom Objects (the different feature above) was explicitly called out as newly available "in all plans" as of its October 2025 release, implying it was previously tier-gated — but that is Custom Objects, not Contact custom fields, and shouldn't be conflated. **No direct confirmation found that Contact custom fields (any type) are plan-gated at all**; treat as unverified rather than assume gating exists.

**Custom-field-specific rate limits beyond the general v2 limits:** None found; see general rate limits above.

---

## Bottom line

**Recommendation: use a Date custom field for `member_since` (option b or c), not a plain tag alone (option a).** A plain tag cannot do date-range segmentation at all — confirmed absent both in the docs (tag filters are exact-match/contains only) and in GHL's own backlog of unmet feature requests for this exact capability (section 3). A Date custom field, by contrast, gets full relative/range operators ("More Than," "In the Last," "Before/After," "Between") natively in Smart Lists (section 1) — this is exactly the "member for 5+ years" use case.

- **(a) Plain tag only** — reject. No way to do "over 5 years" filtering; would require staff to manually maintain a growing set of exact-match tags (`member since: 2019`, `member since: 2020`, …) and combine them with OR logic for range queries, which is unworkable and doesn't even give arbitrary ranges (e.g. "3–7 years").
- **(b) Custom field only** — recommended if nothing else currently reads the `member since` tag. Cleanest: one Date field, full native date-filter operators, zero redundant data. Costs nothing extra in API calls or rate-limit budget, since `customFields` can ride in the same `POST /contacts/upsert` call the pipeline already makes for tags (section 2) — no architecture change to the "one upsert per contact per sync run" pattern.
- **(c) Both (tag + custom field)** — do this only if there's a concrete present-day consumer of a `member since` tag (e.g. an existing GHL workflow trigger keyed off that tag, or staff habit already built around tag search). Otherwise it's redundant data to keep in sync for no benefit — the custom field alone covers every use case a raw-date tag would, plus range queries the tag can't do.
- **(d) Bucketed tag** (`member since: 5+ years`) **instead of/alongside a raw field** — only worth it if staff specifically want tag-based UI (tag pills, tag-driven workflow triggers) rather than filter-builder UI, since GHL workflows key naturally off tag-added events (section 3) in a way they don't off arbitrary field-value thresholds without extra automation plumbing. This is cheap to add since the pipeline already computes `member_since` server-side — it can emit both the exact Date field and a derived bucket tag in the same run at no added API cost. Bucket boundaries then live in the pipeline's own logic, not in GHL, so they're easy to change later. If the immediate need is just "let staff build a segment for 5+ year members," the custom field alone (b) already fully solves it without needing this extra tag.

Net: implement (b) at minimum — a `DATE` custom field, `model: "contact"`, set via the existing upsert call. Add (d), a bucketed tag, only if a concrete tag-driven workflow use case shows up later; it's cheap to bolt on since the raw date already exists.
