import { memo, useEffect, useRef } from "react";
import type { ItemKind, ItemOptions, ItemInstanceOf } from "../core/3d/types/item-registry";
import type { DragHandler, ClickHandler, HoverHandler } from "../core/3d/types/interaction-events";
import { useScene } from "./context";
import { isBoundAtom, shallowEqual } from "./utils";

// Keys that are not item options
const NON_OPTION_KEYS = new Set(["onDrag", "onClick", "onHover", "ref"]);

export type ItemComponentProps<K extends ItemKind> = ItemOptions<K> & {
  onDrag?: DragHandler<K>;
  onClick?: ClickHandler<K>;
  onHover?: HoverHandler<K>;
  ref?: React.Ref<ItemInstanceOf<K>>;
};

export function createItemComponent<K extends ItemKind>(kind: K) {
  function ItemComponent(props: ItemComponentProps<K>) {
    const scene = useScene();
    const itemRef = useRef<ItemInstanceOf<K> | null>(null);
    const prevPropsRef = useRef<Record<string, unknown>>({});

    // Mount: create item; Unmount: remove item
    useEffect(() => {
      const options: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (!NON_OPTION_KEYS.has(key)) {
          options[key] = (props as any)[key];
        }
      }

      const item = scene.create(kind, options as ItemOptions<K>);
      itemRef.current = item as ItemInstanceOf<K>;

      // Capture initial plain-value props for future diffing
      const initialProps: Record<string, unknown> = {};
      for (const key of Object.keys(options)) {
        initialProps[key] = options[key];
      }
      prevPropsRef.current = initialProps;

      return () => {
        scene.remove(item as any);
        itemRef.current = null;
      };
      // Only run on mount/unmount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene]);

    // Sync ref
    useEffect(() => {
      const ref = props.ref;
      if (!ref) return undefined;
      if (typeof ref === "function") {
        ref(itemRef.current);
        return () => { ref(null); };
      }
      (ref as React.RefObject<ItemInstanceOf<K> | null>).current = itemRef.current;
      return () => {
        (ref as React.RefObject<ItemInstanceOf<K> | null>).current = null;
      };
    });

    // Update plain-value props that changed
    useEffect(() => {
      const item = itemRef.current;
      if (!item) return;

      const prev = prevPropsRef.current;
      const nextProps: Record<string, unknown> = {};

      for (const key of Object.keys(props)) {
        if (NON_OPTION_KEYS.has(key)) continue;
        const value = (props as any)[key];
        nextProps[key] = value;

        if (isBoundAtom(value)) continue;

        if (!shallowEqual(value, prev[key])) {
          const field = (item as any)[key];
          if (field && typeof field.set === "function") {
            field.set(value);
          }
        }
      }

      prevPropsRef.current = nextProps;
    });

    // Event handlers: register only when handler props change.
    useEffect(() => {
      const item = itemRef.current;
      if (!item) return;

      if (props.onDrag) {
        item.on("drag", props.onDrag as any);
      } else {
        item.off("drag");
      }

      if (props.onClick) {
        item.on("click", props.onClick as any);
      } else {
        item.off("click");
      }

      if (props.onHover) {
        item.on("hover", props.onHover as any);
      } else {
        item.off("hover");
      }

      // Always clear handlers when deps change/unmount to avoid stale callbacks.
      return () => {
        item.off("drag");
        item.off("click");
        item.off("hover");
      };
    }, [props.onDrag, props.onClick, props.onHover]);

    return null;
  }

  ItemComponent.displayName = kind.charAt(0).toUpperCase() + kind.slice(1);
  return memo(ItemComponent) as React.FC<ItemComponentProps<K>>;
}
