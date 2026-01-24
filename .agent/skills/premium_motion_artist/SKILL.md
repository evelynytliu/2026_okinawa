---
name: premium_motion_artist
description: Expertly crafts high-end, premium web animations using Framer Motion and CSS transitions to create a "wow" factor.
---

# Premium Motion Artist Skill

This skill allows Antigravity to implement sophisticated, magazine-quality web animations that feel expensive, fluid, and modern.

## Core Animation Principles

1.  **Staggered Entrance**: Avoid elements popping in all at once. Use `staggerChildren` or custom delays to create a "cascading" effect.
2.  **Spring Physics**: Use spring transitions (`type: "spring"`) for movement to create a natural, physical feel. Avoid linear easings unless for decorative backgrounds.
3.  **Layout Transformations**: Use Framer Motion's `layout` and `layoutId` to morph elements smoothly when state changes or items are reordered.
4.  **Micro-interactions**: Every clickable or hoverable element should have a subtle response (e.g., `whileHover={{ scale: 1.02 }}`, `whileTap={{ scale: 0.98 }}`).
5.  **Scroll-trigger Animations**: Use `whileInView` and `viewport` props to animate content as the user scrolls, creating a guided experience.
6.  **Depth & Parallax**: Use multiple layers with different scroll speeds or subtle mouse-tracking to create a sense of Z-depth.

## Implementation Recipes

### 1. Staggered Card Entrance
```javascript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

// Usage
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => <motion.div key={item.id} variants={itemVariants} />)}
</motion.div>
```

### 2. Animated Shared Element (Magic Motion)
Use `layoutId` for tabs, highlights, or modal expansions to maintain visual continuity.

### 3. Glassmorphism + Floating Effect
Combine `backdrop-filter: blur()` with a floating `animate` keyframe.
```javascript
<motion.div
  animate={{ y: [0, -10, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
  className="glass-card"
/>
```

## Aesthetic Guidelines
- **Soft Shadows**: Use multi-layered `box-shadow` or Framer Motion's shadow animation.
- **Color Gradients**: Transition backgrounds or text-clipping gradients.
- **Minimalism**: Animations should support the content, not distract from it. If it feels too "busy", slow down the duration or reduce the movement range.
