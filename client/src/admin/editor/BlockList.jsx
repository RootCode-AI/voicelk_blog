import { Reorder, useDragControls } from 'motion/react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import { blockMeta } from '../../blocks/registry.js';
import AddBlockMenu from './AddBlockMenu.jsx';
import BlockFields from './fields.jsx';

function BlockCard({ block, index, count, actions, onError }) {
  const controls = useDragControls();
  const meta = blockMeta(block.type);
  const Icon = meta?.icon;

  return (
    <Reorder.Item
      value={block.id}
      dragListener={false}
      dragControls={controls}
      className="relative"
      whileDrag={{ scale: 1.01, boxShadow: '0px 10px 40px 5px rgba(194,194,194,0.35)', zIndex: 50 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
    >
      <section className="card group/block" aria-label={`${meta?.label ?? block.type} block ${index + 1}`}>
        <header className="flex items-center gap-1 border-b border-line px-2 py-1.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            className="btn-icon cursor-grab touch-none active:cursor-grabbing"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
            {Icon && <Icon className="size-3.5" />}
            {meta?.label ?? block.type}
          </span>
          <div className="ml-auto flex items-center opacity-60 transition-opacity group-focus-within/block:opacity-100 group-hover/block:opacity-100">
            <button type="button" className="btn-icon" onClick={() => actions.move(index, -1)} disabled={index === 0} aria-label="Move up" title="Move up">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" className="btn-icon" onClick={() => actions.move(index, 1)} disabled={index === count - 1} aria-label="Move down" title="Move down">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" className="btn-icon" onClick={() => actions.duplicate(index)} aria-label="Duplicate" title="Duplicate">
              <Copy className="size-4" />
            </button>
            <button type="button" className="btn-icon hover:text-danger!" onClick={() => actions.remove(index)} aria-label="Delete block" title="Delete block">
              <Trash2 className="size-4" />
            </button>
          </div>
        </header>
        <div className="p-4">
          <BlockFields
            block={block}
            onChange={(data) => actions.update(index, data)}
            onInsertAfter={(type, data) => actions.insert(index + 1, type, data)}
            onError={onError}
          />
        </div>
      </section>
      <AddBlockMenu onPick={(type) => actions.insert(index + 1, type)} />
    </Reorder.Item>
  );
}

export default function BlockList({ blocks, actions, onError }) {
  return (
    <div>
      <AddBlockMenu onPick={(type) => actions.insert(0, type)} />
      <Reorder.Group axis="y" values={blocks.map((b) => b.id)} onReorder={actions.reorder} className="space-y-0">
        {blocks.map((block, index) => (
          <BlockCard key={block.id} block={block} index={index} count={blocks.length} actions={actions} onError={onError} />
        ))}
      </Reorder.Group>
      <div className="mt-4">
        <AddBlockMenu variant="full" onPick={(type) => actions.insert(blocks.length, type)} />
      </div>
    </div>
  );
}
