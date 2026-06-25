# formats/

- `schema-types.ts`, Defines FormatId discriminant, JukeboxExpFields, and typed serialization envelope shapes
- `jukebox-exp.ts`, Serializes and deserializes songs in the JukeboxExp JSON format
- `legacy-compat.ts`, Strips exp-only fields and remaps format metadata for slarmoosbox/ultrabox/etc compat
- `json-serialization.ts`, JSON serialization/deserialization (toJsonObjectImpl, fromJsonObjectImpl) with legacy sample name migration
- `index.ts`, Barrel re-export for the formats layer
