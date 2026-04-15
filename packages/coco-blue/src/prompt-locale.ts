/**
 * 覆盖 prompts multiselect 内置的英文 Instructions（见 prompts/lib/elements/multiselect.js）。
 */
export const PROMPTS_MULTISELECT_INSTRUCTIONS = `
说明：
    ↑/↓：移动高亮
    ←/→/空格：切换选中
    a：全选/取消全选
    回车：确认`.trimStart();
