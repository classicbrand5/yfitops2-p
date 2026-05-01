// ─────────────────────────────────────────────────────────
// YFitOps Dark Theme — Monaco Editor
// Matches design system: mint (#00F5A0) + violet (#7C3AED)
// JetBrains Mono, dark void background
// ─────────────────────────────────────────────────────────

import type { editor } from 'monaco-editor';

export const YFITOPS_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'E0E0F0' },
    { token: 'comment', foreground: '4A4A6A', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '4A4A6A', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '4A4A6A', fontStyle: 'italic' },
    { token: 'keyword', foreground: '9B6EF5' },          // violet-400
    { token: 'keyword.control', foreground: '9B6EF5' },
    { token: 'keyword.operator', foreground: '9B6EF5' },
    { token: 'storage.type', foreground: '9B6EF5' },
    { token: 'storage.modifier', foreground: '9B6EF5' },
    { token: 'string', foreground: '00F5A0' },            // mint
    { token: 'string.quoted', foreground: '00F5A0' },
    { token: 'string.template', foreground: '00D488' },
    { token: 'number', foreground: '38BDF8' },            // info blue
    { token: 'constant.numeric', foreground: '38BDF8' },
    { token: 'constant.language', foreground: 'FBBF24' }, // warning yellow
    { token: 'constant', foreground: 'FBBF24' },
    { token: 'type', foreground: '67E3FF' },              // brightBlue
    { token: 'type.identifier', foreground: '67E3FF' },
    { token: 'entity.name.type', foreground: '67E3FF' },
    { token: 'entity.name.class', foreground: '67E3FF' },
    { token: 'entity.name.function', foreground: 'C8C8E8' },
    { token: 'support.function', foreground: '00F5A0' },
    { token: 'variable', foreground: 'C8C8E8' },
    { token: 'variable.parameter', foreground: 'B794F6' },
    { token: 'variable.other', foreground: 'C8C8E8' },
    { token: 'delimiter', foreground: '5C5C7A' },
    { token: 'delimiter.bracket', foreground: '5C5C7A' },
    { token: 'delimiter.parenthesis', foreground: '5C5C7A' },
    { token: 'punctuation', foreground: '5C5C7A' },
    { token: 'operator', foreground: '9B6EF5' },
    { token: 'tag', foreground: '9B6EF5' },
    { token: 'tag.id', foreground: '00F5A0' },
    { token: 'tag.class', foreground: '38BDF8' },
    { token: 'attribute.name', foreground: '00F5A0' },
    { token: 'attribute.value', foreground: '00D488' },
    { token: 'metatag', foreground: 'FBBF24' },
    { token: 'regexp', foreground: '22D3EE' },
    { token: 'annotation', foreground: 'FBBF24' },
    { token: 'decorator', foreground: 'FBBF24' },
  ],
  colors: {
    // Editor core
    'editor.background': '#09090F',
    'editor.foreground': '#C8C8E8',
    'editor.lineHighlightBackground': '#13131C80',
    'editor.lineHighlightBorder': '#00000000',
    'editor.selectionBackground': '#00F5A030',
    'editor.inactiveSelectionBackground': '#00F5A018',
    'editor.selectionHighlightBackground': '#00F5A015',
    'editor.wordHighlightBackground': '#9B6EF520',
    'editor.wordHighlightStrongBackground': '#9B6EF535',

    // Cursor
    'editorCursor.foreground': '#00F5A0',
    'editorCursor.background': '#09090F',

    // Line numbers
    'editorLineNumber.foreground': '#3A3A52',
    'editorLineNumber.activeForeground': '#9494B8',

    // Gutter
    'editorGutter.background': '#09090F',
    'editorGutter.addedBackground': '#00F5A0',
    'editorGutter.modifiedBackground': '#FBBF24',
    'editorGutter.deletedBackground': '#FF4D6D',

    // Whitespace
    'editorWhitespace.foreground': '#2A2A3A',

    // Indent guides
    'editorIndentGuide.background': '#1C1C2780',
    'editorIndentGuide.activeBackground': '#3A3A52',

    // Bracket match
    'editorBracketMatch.background': '#00F5A020',
    'editorBracketMatch.border': '#00F5A060',

    // Bracket pair colorization
    'editorBracketHighlight.foreground1': '#9B6EF5',
    'editorBracketHighlight.foreground2': '#00F5A0',
    'editorBracketHighlight.foreground3': '#38BDF8',

    // Find/replace
    'editor.findMatchBackground': '#FBBF2440',
    'editor.findMatchHighlightBackground': '#FBBF2420',
    'editor.findMatchBorder': '#FBBF2480',

    // Ruler / guides
    'editorRuler.foreground': '#1C1C27',

    // Minimap
    'minimap.background': '#07070D',
    'minimap.selectionHighlight': '#00F5A040',
    'minimap.findMatchHighlight': '#FBBF2460',
    'minimapGutter.addedBackground': '#00F5A0',
    'minimapGutter.modifiedBackground': '#FBBF24',
    'minimapGutter.deletedBackground': '#FF4D6D',

    // Scrollbar
    'scrollbarSlider.background': '#2A2A3540',
    'scrollbarSlider.hoverBackground': '#3A3A5260',
    'scrollbarSlider.activeBackground': '#5C5C7A80',
    'scrollbar.shadow': '#00000060',

    // Overview ruler
    'editorOverviewRuler.border': '#1C1C27',
    'editorOverviewRuler.findMatchForeground': '#FBBF24',
    'editorOverviewRuler.addedForeground': '#00F5A0',
    'editorOverviewRuler.modifiedForeground': '#FBBF24',
    'editorOverviewRuler.deletedForeground': '#FF4D6D',
    'editorOverviewRuler.errorForeground': '#FF4D6D',
    'editorOverviewRuler.warningForeground': '#FBBF24',

    // Error/warning squiggles
    'editorError.foreground': '#FF4D6D',
    'editorWarning.foreground': '#FBBF24',
    'editorInfo.foreground': '#38BDF8',
    'editorHint.foreground': '#00F5A0',

    // Suggest / autocomplete
    'editorSuggestWidget.background': '#13131C',
    'editorSuggestWidget.border': '#2A2A35',
    'editorSuggestWidget.foreground': '#C8C8E8',
    'editorSuggestWidget.selectedBackground': '#00F5A012',
    'editorSuggestWidget.selectedForeground': '#EEEEFF',
    'editorSuggestWidget.highlightForeground': '#00F5A0',
    'editorSuggestWidget.focusHighlightForeground': '#00F5A0',

    // Hover widget
    'editorHoverWidget.background': '#13131C',
    'editorHoverWidget.border': '#2A2A35',
    'editorHoverWidget.foreground': '#C8C8E8',

    // Parameter hints
    'editorHoverWidget.statusBarBackground': '#0F0F17',

    // Peek view
    'peekView.border': '#00F5A040',
    'peekViewEditor.background': '#09090F',
    'peekViewResult.background': '#0F0F17',
    'peekViewTitle.background': '#13131C',
    'peekViewEditor.matchHighlightBackground': '#00F5A030',
    'peekViewResult.matchHighlightBackground': '#00F5A030',
    'peekViewResult.selectionBackground': '#00F5A015',

    // Widget (find, replace)
    'editorWidget.background': '#13131C',
    'editorWidget.border': '#2A2A35',
    'editorWidget.foreground': '#C8C8E8',
    'editorWidget.resizeBorder': '#00F5A0',

    // Diff editor
    'diffEditor.insertedTextBackground': '#00F5A015',
    'diffEditor.removedTextBackground': '#FF4D6D15',
    'diffEditor.insertedLineBackground': '#00F5A00A',
    'diffEditor.removedLineBackground': '#FF4D6D0A',

    // Status bar (if used)
    'statusBar.background': '#07070D',
    'statusBar.foreground': '#5C5C7A',
    'statusBar.border': '#1C1C27',
  },
};
