import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Choice, Mission, Order, Select, SourceRef } from '../../content/types';
import type { StampArtifact } from '../../content/stampArtifacts';

type DiscoveryRevealProps = {
  mission: Mission;
  stamp: StampArtifact;
  onDone: () => void;
  renderSource?: (source: SourceRef) => ReactNode;
};

/**
 * A small discovery deck. The text stays closed until the learner opens the
 * card, so the first screen has a clear goal instead of a wall of copy.
 */
export function DiscoveryReveal({ mission, stamp, onDone, renderSource }: DiscoveryRevealProps) {
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const allRevealed = revealed.size >= mission.discovery.length;

  const toggleReveal = (index: number) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="expedition-discovery" data-discovery-reveal-board>
      <div className="expedition-goal-card">
        <div className="expedition-goal-copy">
          <p className="expedition-kicker">MỤC TIÊU CHẶNG</p>
          <h2>{mission.title}</h2>
          <p>Mở từng manh mối, rồi dùng chúng để tìm đường tới dấu {stamp.name}.</p>
          <div className="expedition-goal-progress" role="status" aria-live="polite">
            <span className="expedition-goal-progress-dot" aria-hidden="true" />
            <span>{revealed.size}/{mission.discovery.length} manh mối đã mở</span>
          </div>
        </div>
        <figure className="expedition-stamp-figure">
          <img data-expedition-stamp src={stamp.src} alt={stamp.alt} />
          <figcaption>{stamp.region}</figcaption>
        </figure>
      </div>

      <div className="discovery-deck" aria-label="Các manh mối cần mở">
        {mission.discovery.map((item, index) => {
          const isRevealed = revealed.has(index);
          return (
            <article className={`discovery-clue${isRevealed ? ' is-revealed' : ''}`} data-discovery-card={index} key={`${item.source.pdfPage}-${item.source.locator}-${index}`}>
              <button
                className="discovery-clue-toggle"
                type="button"
                data-discovery-reveal={index}
                aria-expanded={isRevealed}
                onClick={() => toggleReveal(index)}
              >
                <span className="discovery-clue-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="discovery-clue-label">{isRevealed ? 'Đóng manh mối' : 'Mở manh mối'}</span>
                <span className="discovery-clue-symbol" aria-hidden="true">{isRevealed ? '−' : '+'}</span>
              </button>
              {isRevealed && (
                <div className="discovery-clue-content" data-discovery-content={index}>
                  <p>{item.text}</p>
                  {renderSource ? renderSource(item.source) : <small data-discovery-source>{item.source.locator}</small>}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="discovery-actions">
        <p className="expedition-helper">Mở đủ các thẻ để ghi nhớ dấu quan trọng.</p>
        <button className="primary-small-button expedition-action-button" type="button" data-discovery-done onClick={onDone} disabled={!allRevealed}>
          Đã xem đủ, vào đường đi <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

type OrderRouteBuilderProps = {
  activity: Order;
  placedIds: string[];
  onPlace: (id: string) => void;
  onUndo: () => void;
  onMove: (index: number, delta: number) => void;
};

function followsCorrectOrder(items: Order['items'], correctOrder: string[]): boolean {
  return items.length === correctOrder.length && items.every((item, index) => item.id === correctOrder[index]);
}

/**
 * Keep the bank deterministic across renders while making its initial order
 * different from the answer whenever the activity has at least two tiles.
 */
function getStableRouteBankItems(activity: Order): Order['items'] {
  const items = [...activity.items];
  if (items.length < 2) return items;

  const rotated = [...items.slice(1), items[0]];
  if (!followsCorrectOrder(rotated, activity.correctOrder)) return rotated;

  const alternate = [...rotated];
  [alternate[0], alternate[1]] = [alternate[1], alternate[0]];
  return alternate;
}

/** Build an ordered route from a bank of unused, content-bearing tiles. */
export function OrderRouteBuilder({ activity, placedIds, onPlace, onUndo, onMove }: OrderRouteBuilderProps) {
  const itemById = new Map(activity.items.map((item) => [item.id, item]));
  const placedSet = new Set(placedIds);
  const bankItems = getStableRouteBankItems(activity).filter((item) => !placedSet.has(item.id));

  return (
    <div className="route-builder" data-route-builder>
      <section className="route-bank" aria-labelledby="route-bank-title">
        <div className="route-section-heading">
          <div>
            <p className="expedition-kicker">KHO THẺ</p>
            <h3 id="route-bank-title">Chạm để đặt điểm dừng</h3>
          </div>
          <span className="route-count" aria-label={`${bankItems.length} thẻ chưa đặt`}>{bankItems.length}</span>
        </div>
        <div className="route-bank-grid">
          {bankItems.map((item) => (
            <button className="route-bank-tile" type="button" data-route-bank={item.id} key={item.id} onClick={() => onPlace(item.id)}>
              <span className="route-tile-pin" aria-hidden="true">+</span>
              <span>{item.text}</span>
            </button>
          ))}
          {bankItems.length === 0 && <p className="route-bank-empty" data-route-bank-empty>Đã đặt đủ điểm dừng.</p>}
        </div>
      </section>

      <section className="route-map" aria-labelledby="route-map-title">
        <div className="route-section-heading">
          <div>
            <p className="expedition-kicker">TUYẾN ĐƯỜNG</p>
            <h3 id="route-map-title">Điểm 1 → điểm cuối</h3>
          </div>
          <button className="route-undo-button" type="button" data-route-undo onClick={onUndo} disabled={placedIds.length === 0}>Hoàn tác</button>
        </div>
        <ol className="route-list" aria-label="Các điểm dừng đã đặt">
          {placedIds.map((id, index) => {
            const item = itemById.get(id);
            if (!item) return null;
            return (
              <li className="route-stop" data-route-placed={id} key={`${id}-${index}`}>
                <span className="route-stop-marker" aria-hidden="true">{index + 1}</span>
                <span className="route-stop-copy">{item.text}</span>
                <span className="route-stop-controls">
                  <button type="button" data-route-move={`${index}-up`} onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Đưa “${item.text}” lên`}>↑</button>
                  <button type="button" data-route-move={`${index}-down`} onClick={() => onMove(index, 1)} disabled={index === placedIds.length - 1} aria-label={`Đưa “${item.text}” xuống`}>↓</button>
                </span>
              </li>
            );
          })}
        </ol>
        {placedIds.length === 0 && <p className="route-empty" data-route-empty>Con đường đang trống. Chọn một thẻ trong kho để bắt đầu.</p>}
      </section>
    </div>
  );
}

type SatchelSelectProps = {
  activity: Select;
  selectedIds: string[];
  onToggle: (id: string) => void;
};

/** Select activity with a persistent pocket for the clues already collected. */
export function SatchelSelect({ activity, selectedIds, onToggle }: SatchelSelectProps) {
  const selectedSet = new Set(selectedIds);
  const selectedItems = activity.options.filter((option) => selectedSet.has(option.id));

  return (
    <div className="satchel-select" data-satchel-board>
      <aside className="satchel-pocket" aria-labelledby="satchel-title">
        <div className="satchel-heading">
          <div>
            <p className="expedition-kicker">TÚI MANH MỐI</p>
            <h3 id="satchel-title">Đã nhặt được</h3>
          </div>
          <span className="satchel-count" aria-label={`${selectedItems.length} trên ${activity.correctIds.length} manh mối đã nhặt`}>{selectedItems.length}/{activity.correctIds.length}</span>
        </div>
        {selectedItems.length === 0 ? (
          <p className="satchel-empty" data-satchel-empty>Túi còn trống. Chọn một thẻ bên dưới để cất vào.</p>
        ) : (
          <ul className="satchel-list">
            {selectedItems.map((item) => (
              <li data-satchel-item={item.id} key={item.id}>
                <span>{item.text}</span>
                <button type="button" data-satchel-remove={item.id} onClick={() => onToggle(item.id)} aria-label={`Bỏ “${item.text}” khỏi túi`}>×</button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="satchel-options" aria-labelledby="satchel-options-title">
        <div className="route-section-heading">
          <div>
            <p className="expedition-kicker">BÃI MANH MỐI</p>
            <h3 id="satchel-options-title">Chạm để nhặt hoặc đặt xuống</h3>
          </div>
        </div>
        <div className="satchel-option-grid">
          {activity.options.map((option, index) => {
            const isSelected = selectedSet.has(option.id);
            return (
              <button className={`satchel-option${isSelected ? ' is-selected' : ''}`} type="button" data-satchel-option={option.id} aria-pressed={isSelected} onClick={() => onToggle(option.id)} key={option.id}>
                <span className="satchel-option-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span>{option.text}</span>
                <span className="satchel-option-mark" aria-hidden="true">{isSelected ? '✓' : '+'}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

type ExpeditionChoiceProps = {
  activity: Choice;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Keep a choice order stable per activity while avoiding a predictable first answer. */
export function getStableChoiceOptions(activity: Choice): Choice['options'] {
  const options = [...activity.options];
  let seed = stableSeed(activity.id);
  for (let index = options.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return options;
}

/** Choice cards frame the answer as an expedition decision without revealing correctness. */
export function ExpeditionChoice({ activity, selectedId, onSelect }: ExpeditionChoiceProps) {
  const options = getStableChoiceOptions(activity);
  return (
    <div className="expedition-choice-grid" role="group" aria-label="Các quyết định trên đường đi">
      {options.map((option, index) => {
        const isSelected = selectedId === option.id;
        return (
          <button className={`expedition-choice-card${isSelected ? ' is-selected' : ''}`} type="button" data-choice-option={option.id} aria-pressed={isSelected} onClick={() => onSelect(option.id)} key={option.id}>
            <span className="expedition-choice-marker" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span className="expedition-choice-copy"><small>NGÃ RẼ {index + 1}</small><strong>{option.text}</strong></span>
            <span className="expedition-choice-check" aria-hidden="true">{isSelected ? '✓' : '→'}</span>
          </button>
        );
      })}
    </div>
  );
}
