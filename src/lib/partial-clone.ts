import { readConfig, writeConfig } from "./config.ts";
import type { GitContext } from "./types.ts";

export function validateObjectFilter(filter: string): "blob:none" {
	if (filter !== "blob:none") throw new Error("Only the blob:none object filter is supported");
	return filter;
}

/** Persist the promise that deliberately omitted objects remain on this remote. */
export async function configurePartialClone(ctx: GitContext, remote: string, filter: "blob:none") {
	const config = await readConfig(ctx);
	const section = config[`remote "${remote}"`];
	if (!section?.url) throw new Error("Filtered fetch requires a configured remote");
	if (
		section.promisor === "true" &&
		section.partialclonefilter === filter &&
		config.extensions?.partialclone === remote
	)
		return;
	section.promisor = "true";
	section.partialclonefilter = filter;
	config.core = { ...config.core, repositoryformatversion: "1" };
	config.extensions = { ...config.extensions, partialclone: remote };
	await writeConfig(ctx, config);
}

/** Maintenance must not mistake promised-but-absent objects for corruption. */
export async function requireCompleteRepository(
	ctx: GitContext,
	operation = "Repository maintenance",
): Promise<void> {
	const config = await readConfig(ctx);
	if (
		config.extensions?.partialclone ||
		Object.values(config).some((section) => section.promisor === "true")
	) {
		throw new Error(`${operation} is not supported for partial clones`);
	}
}
