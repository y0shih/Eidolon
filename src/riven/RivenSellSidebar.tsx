import React, { useState, useEffect, useRef, useMemo } from "react";
import type { RivenSellQueueItem } from "../types/market";
import {
  formatRivenCopy,
  formatRivenSingle,
  formatRivenBatch,
  getFittingBatch,
  DEFAULT_DIRECT_TPL,
  DEFAULT_AUCTION_TPL,
  DEFAULT_ICON,
  DEFAULT_BATCH_PREFIX,
  DEFAULT_BATCH_SUFFIX,
  DEFAULT_BATCH_SEP,
  type RivenBatchMode,
  type RivenBatchConfig,
} from "./rivenSellFormat";
import "./RivenSellSidebar.css";

// Re-export for backwards compatibility
export { formatRivenCopy };

interface Props {
  open: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  items: RivenSellQueueItem[];
  onUpdateItem: (id: string, patch: Partial<RivenSellQueueItem>) => void;
  onRemoveItem: (id: string) => void;
  onClear: () => void;
}

const ICON_PRESETS = [":platinum:", ":fire:", "★", "⚡", "::"];
const SEP_PRESETS = [" | ", ", ", " - ", " / "];

export default function RivenSellSidebar({
  open,
  onClose,
  width,
  onWidthChange,
  items,
  onUpdateItem,
  onRemoveItem,
  onClear,
}: Props) {
  const [batchMode, setBatchMode] = useState<RivenBatchMode>(
    () => (localStorage.getItem("ff_riven_batch_mode") as RivenBatchMode) ?? "grouped"
  );
  const [batchPrefix, setBatchPrefix] = useState(
    () => localStorage.getItem("ff_riven_batch_prefix") ?? DEFAULT_BATCH_PREFIX
  );
  const [batchSuffix, setBatchSuffix] = useState(
    () => localStorage.getItem("ff_riven_batch_suffix") ?? DEFAULT_BATCH_SUFFIX
  );
  const [batchSep, setBatchSep] = useState(
    () => localStorage.getItem("ff_riven_batch_sep") ?? DEFAULT_BATCH_SEP
  );
  const [directTpl, setDirectTpl] = useState(
    () => localStorage.getItem("ff_riven_direct_tpl") ?? DEFAULT_DIRECT_TPL
  );
  const [auctionTpl, setAuctionTpl] = useState(
    () => localStorage.getItem("ff_riven_auction_tpl") ?? DEFAULT_AUCTION_TPL
  );
  const [icon, setIcon] = useState(
    () => localStorage.getItem("ff_riven_icon") ?? DEFAULT_ICON
  );

  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [fitCopied, setFitCopied] = useState(false);

  // Persistence
  useEffect(() => { localStorage.setItem("ff_riven_batch_mode", batchMode); }, [batchMode]);
  useEffect(() => { localStorage.setItem("ff_riven_batch_prefix", batchPrefix); }, [batchPrefix]);
  useEffect(() => { localStorage.setItem("ff_riven_batch_suffix", batchSuffix); }, [batchSuffix]);
  useEffect(() => { localStorage.setItem("ff_riven_batch_sep", batchSep); }, [batchSep]);
  useEffect(() => { localStorage.setItem("ff_riven_direct_tpl", directTpl); }, [directTpl]);
  useEffect(() => { localStorage.setItem("ff_riven_auction_tpl", auctionTpl); }, [auctionTpl]);
  useEffect(() => { localStorage.setItem("ff_riven_icon", icon); }, [icon]);

  // Resizing logic (left edge dragged to adjust sidebar width)
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(width);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startXRef.current - ev.clientX;
      const newW = Math.max(220, Math.min(540, startWRef.current + delta));
      onWidthChange(newW);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const batchConfig: RivenBatchConfig = useMemo(() => ({
    mode: batchMode,
    directTpl,
    auctionTpl,
    icon,
    batchPrefix,
    batchSuffix,
    batchSep,
  }), [batchMode, directTpl, auctionTpl, icon, batchPrefix, batchSuffix, batchSep]);

  const allText = useMemo(() => formatRivenBatch(items, batchConfig), [items, batchConfig]);
  const charCount = allText.length;
  const isOverLimit = charCount > 180;
  const fitting = useMemo(() => getFittingBatch(items, batchConfig, 180), [items, batchConfig]);

  if (!open) return null;

  const copySingle = (item: RivenSellQueueItem) => {
    const text = formatRivenSingle(item, directTpl, auctionTpl, icon);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  const copyAll = () => {
    if (!allText) return;
    navigator.clipboard.writeText(allText).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 1500);
    }).catch(() => {});
  };

  const copyFitting = () => {
    if (!fitting.text) return;
    navigator.clipboard.writeText(fitting.text).then(() => {
      setFitCopied(true);
      setTimeout(() => setFitCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <aside className="riven-sell-sidebar" style={{ width }}>
      {/* Drag handle on left edge */}
      <div className="rss-resize-handle" onMouseDown={handleMouseDown} title="Drag to resize sidebar" />

      <div className="rss-inner">
        {/* Header */}
        <div className="rss-header">
          <div className="rss-title">
            <span>Riven Sell Copy</span>
            {items.length > 0 && <span className="rss-count-badge">{items.length}</span>}
          </div>
          <button
            className="rss-icon-btn"
            title="Configure Sell Templates"
            onClick={() => setShowConfig(c => !c)}
          >
            ⚙
          </button>
          <button className="rss-icon-btn" title="Close Sidebar" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Collapsible Template Settings */}
        {showConfig && (
          <div className="rss-config-panel">
            {/* Batch mode selector */}
            <div className="rss-config-row">
              <span className="rss-config-label">Batch Format Mode</span>
              <div className="rss-mode-pills">
                <button
                  type="button"
                  className={`rss-mode-pill-btn${batchMode === "grouped" ? " active" : ""}`}
                  onClick={() => setBatchMode("grouped")}
                  title="Single WTS header + delimiter (saves chat characters)"
                >
                  Grouped (Compact)
                </button>
                <button
                  type="button"
                  className={`rss-mode-pill-btn${batchMode === "separate" ? " active" : ""}`}
                  onClick={() => setBatchMode("separate")}
                  title="Repeat full template per item"
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Grouped mode settings */}
            {batchMode === "grouped" && (
              <>
                <div className="rss-config-row">
                  <span className="rss-config-label">Grouped Header ({`{icon}`})</span>
                  <input
                    className="rss-config-input"
                    value={batchPrefix}
                    onChange={e => setBatchPrefix(e.target.value)}
                    placeholder="WTS {icon}"
                  />
                </div>

                <div className="rss-config-row">
                  <span className="rss-config-label">Item Separator</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      className="rss-config-input"
                      style={{ width: 70 }}
                      value={batchSep}
                      onChange={e => setBatchSep(e.target.value)}
                    />
                    <div className="rss-icon-presets">
                      {SEP_PRESETS.map(s => (
                        <button
                          key={s}
                          type="button"
                          className="rss-icon-chip"
                          onClick={() => setBatchSep(s)}
                        >
                          &quot;{s.trim()}&quot;
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rss-config-row">
                  <span className="rss-config-label">Grouped Suffix ({`{icon}`})</span>
                  <input
                    className="rss-config-input"
                    value={batchSuffix}
                    onChange={e => setBatchSuffix(e.target.value)}
                    placeholder="{icon}"
                  />
                </div>
              </>
            )}

            <div className="rss-config-row">
              <span className="rss-config-label">Direct Sale Template</span>
              <input
                className="rss-config-input"
                value={directTpl}
                onChange={e => setDirectTpl(e.target.value)}
                placeholder="WTS {icon} {item} {price} {icon}"
              />
            </div>

            <div className="rss-config-row">
              <span className="rss-config-label">Auction Template</span>
              <input
                className="rss-config-input"
                value={auctionTpl}
                onChange={e => setAuctionTpl(e.target.value)}
                placeholder="WTS {icon} {item} PMO >{price} {icon}"
              />
            </div>

            <div className="rss-config-row">
              <span className="rss-config-label">Icon / Emoji ({`{icon}`})</span>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="rss-config-input"
                  style={{ width: 100 }}
                  value={icon}
                  onChange={e => setIcon(e.target.value)}
                />
                <div className="rss-icon-presets">
                  {ICON_PRESETS.map(p => (
                    <button key={p} type="button" className="rss-icon-chip" onClick={() => setIcon(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queue Items */}
        <div className="rss-queue-list">
          {items.length === 0 ? (
            <div className="rss-empty-hint">
              <span style={{ fontSize: 22 }}>📋</span>
              <span>No rivens queued.</span>
              <span>Go to Market → Rivens, select rivens, and click &quot;Create Sell Template&quot;.</span>
            </div>
          ) : (
            items.map(item => {
              const previewText = formatRivenSingle(item, directTpl, auctionTpl, icon);
              const isCopied = copiedId === item.id;
              return (
                <div key={item.id} className="rss-item-card">
                  <div className="rss-item-header">
                    <span className="rss-item-name">{item.weaponName} {item.modName}</span>
                    <button
                      className="rss-icon-btn"
                      title="Remove from queue"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="rss-item-preview-text">{previewText}</div>

                  <div className="rss-item-controls">
                    <button
                      className={`rss-item-mode-pill ${item.mode}`}
                      onClick={() => onUpdateItem(item.id, { mode: item.mode === "direct" ? "auction" : "direct" })}
                      title="Toggle Direct vs Auction (PMO)"
                    >
                      {item.mode === "direct" ? "DIR" : "AUC"}
                    </button>

                    <input
                      className="rss-item-price-input"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={e => onUpdateItem(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      title="Adjust price"
                    />
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>p</span>

                    <button
                      className={`rss-copy-btn${isCopied ? " copied" : ""}`}
                      onClick={() => copySingle(item)}
                      title="Copy single item to clipboard"
                    >
                      {isCopied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Batch Actions */}
        {items.length > 0 && (
          <div className="rss-footer">
            <div className="rss-char-counter">
              <span>Trade Chat limit ({batchMode}):</span>
              <span className={isOverLimit ? "rss-char-warning" : ""}>
                {charCount} / 180 chars {isOverLimit && `(+${charCount - 180} over!)`}
              </span>
            </div>

            <div className="rss-batch-btns">
              {isOverLimit ? (
                <>
                  <button
                    className={`rss-btn-copy-fit${fitCopied ? " copied" : ""}`}
                    onClick={copyFitting}
                    disabled={fitting.count === 0}
                    title={`Copy first ${fitting.count} rivens that fit under 180 characters (${fitting.text.length} chars)`}
                  >
                    {fitCopied ? `✓ Copied (${fitting.count})` : `Copy Fit (${fitting.count}/${items.length})`}
                  </button>
                  <button
                    className={`rss-btn-copy-all warning-mode${allCopied ? " copied" : ""}`}
                    onClick={copyAll}
                    title="Copy all rivens anyway (exceeds chat limit)"
                  >
                    {allCopied ? "✓ All Copied" : "Copy All"}
                  </button>
                </>
              ) : (
                <button
                  className={`rss-btn-copy-all${allCopied ? " copied" : ""}`}
                  onClick={copyAll}
                  disabled={items.length === 0}
                  title="Copy combined message to clipboard"
                >
                  {allCopied ? "✓ All Copied!" : "Copy All"}
                </button>
              )}

              <button className="rss-btn-clear" onClick={onClear} title="Clear all queued rivens">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
