// synth/plugins/registry.ts
//
// Purpose: Plugin registry mapping InstrumentType → SynthPlugin
//
// This module:
// - Provides registerPlugin() for self-registering plugins
// - Provides getPlugin() for synth.ts dispatch lookup
// - Plugins call registerPlugin() at module load time

import type { InstrumentType } from "../SynthConfig";
import type { SynthPlugin } from "./interfaces";

const plugins = new Map<InstrumentType, SynthPlugin>();

export function registerPlugin(plugin: SynthPlugin): void {
    if (plugins.has(plugin.type)) {
        console.warn(`SynthPlugin already registered for type ${plugin.type}: ${plugin.name}`);
    }
    plugins.set(plugin.type, plugin);
}

export function getPlugin(type: InstrumentType): SynthPlugin | undefined {
    return plugins.get(type);
}

export function getAllPlugins(): IterableIterator<[InstrumentType, SynthPlugin]> {
    return plugins.entries();
}

export function getRegisteredPlugins(): SynthPlugin[] {
    return Array.from(plugins.values());
}
