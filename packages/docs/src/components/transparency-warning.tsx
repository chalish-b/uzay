import { Callout } from "fumadocs-ui/components/callout";

export function TransparencyWarning() {
  return (
    <Callout type="warning">
      Multiple transparent items that overlap can cause rendering artifacts where
      one hides the other. If you need overlapping items, keep at most one of
      them transparent.
    </Callout>
  );
}
