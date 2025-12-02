# StackView RadialMenu Integration Steps

1. Add import: `import { RadialMenu, type RadialDirection } from "./RadialMenuNew";`
2. Remove unused icons from import
3. Add menuPosition state: `const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);`
4. Update handlePointerDown to capture position
5. Add handleRadialMenuSelect handler
6. Update all handlePointerDown calls to pass event
7. Remove all inline radial menu JSX  
8. Add RadialMenu component at end before WordDetailModal
