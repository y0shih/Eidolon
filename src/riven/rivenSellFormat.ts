import type { RivenSellQueueItem } from "../types/market";

export const DEFAULT_DIRECT_TPL = "WTS {icon} {item} {price} {icon}";
export const DEFAULT_AUCTION_TPL = "WTS {icon} {item} PMO >{price} {icon}";
export const DEFAULT_ICON = ":platinum:";
export const DEFAULT_BATCH_PREFIX = "WTS {icon}";
export const DEFAULT_BATCH_SUFFIX = "{icon}";
export const DEFAULT_BATCH_SEP = " | ";
export const DEFAULT_DIRECT_ITEM_TPL = "{item} {price}";
export const DEFAULT_AUCTION_ITEM_TPL = "{item} PMO >{price}";

export type RivenBatchMode = "grouped" | "separate";

export interface RivenBatchConfig {
  mode: RivenBatchMode;
  directTpl: string;
  auctionTpl: string;
  icon: string;
  batchPrefix: string;
  batchSuffix: string;
  batchSep: string;
  directItemTpl?: string;
  auctionItemTpl?: string;
}

export function formatRivenSingle(
  item: RivenSellQueueItem,
  directTpl = DEFAULT_DIRECT_TPL,
  auctionTpl = DEFAULT_AUCTION_TPL,
  icon = DEFAULT_ICON
): string {
  const tpl = item.mode === "auction" ? auctionTpl : directTpl;
  const itemToken = `[${item.weaponName} ${item.modName}]`.trim();
  const priceToken = `${item.price}p`;

  return tpl
    .replace(/\{item\}/gi, itemToken)
    .replace(/\{price\}/gi, priceToken)
    .replace(/\{icon\}/gi, icon)
    .trim();
}

/** Backwards-compatible alias for formatRivenSingle */
export const formatRivenCopy = formatRivenSingle;

export function formatRivenItemFragment(
  item: RivenSellQueueItem,
  directItemTpl = DEFAULT_DIRECT_ITEM_TPL,
  auctionItemTpl = DEFAULT_AUCTION_ITEM_TPL
): string {
  const tpl = item.mode === "auction" ? auctionItemTpl : directItemTpl;
  const itemToken = `[${item.weaponName} ${item.modName}]`.trim();
  const priceToken = `${item.price}p`;

  return tpl
    .replace(/\{item\}/gi, itemToken)
    .replace(/\{price\}/gi, priceToken)
    .trim();
}

export function formatRivenBatch(
  items: RivenSellQueueItem[],
  config: Partial<RivenBatchConfig> = {}
): string {
  if (items.length === 0) return "";

  const mode = config.mode ?? "grouped";
  const directTpl = config.directTpl ?? DEFAULT_DIRECT_TPL;
  const auctionTpl = config.auctionTpl ?? DEFAULT_AUCTION_TPL;
  const icon = config.icon ?? DEFAULT_ICON;

  if (mode === "separate" || items.length === 1) {
    return items.map(it => formatRivenSingle(it, directTpl, auctionTpl, icon)).join(" ");
  }

  const prefix = (config.batchPrefix ?? DEFAULT_BATCH_PREFIX).replace(/\{icon\}/gi, icon).trim();
  const suffix = (config.batchSuffix ?? DEFAULT_BATCH_SUFFIX).replace(/\{icon\}/gi, icon).trim();
  const sep = config.batchSep ?? DEFAULT_BATCH_SEP;
  const directItemTpl = config.directItemTpl ?? DEFAULT_DIRECT_ITEM_TPL;
  const auctionItemTpl = config.auctionItemTpl ?? DEFAULT_AUCTION_ITEM_TPL;

  const itemParts = items.map(it => formatRivenItemFragment(it, directItemTpl, auctionItemTpl));
  const joinedItems = itemParts.join(sep);

  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (joinedItems) parts.push(joinedItems);
  if (suffix) parts.push(suffix);

  return parts.join(" ").trim();
}

export function getFittingBatch(
  items: RivenSellQueueItem[],
  config: Partial<RivenBatchConfig> = {},
  maxChars = 180
): { text: string; count: number; total: number } {
  if (items.length === 0) {
    return { text: "", count: 0, total: 0 };
  }

  for (let count = items.length; count >= 1; count--) {
    const candidateText = formatRivenBatch(items.slice(0, count), config);
    if (candidateText.length <= maxChars || count === 1) {
      return { text: candidateText, count, total: items.length };
    }
  }

  return { text: "", count: 0, total: items.length };
}
