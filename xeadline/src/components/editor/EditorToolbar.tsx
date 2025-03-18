import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $createLinkNode, $isLinkNode } from '@lexical/link';
import { Icon } from '@/components/ui/Icon';

interface ToolbarButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  active = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
      active ? 'text-bottle-green dark:text-bottle-green-400' : 'text-gray-700 dark:text-gray-300'
    }`}
    title={label}
  >
    <Icon name={icon} className="w-5 h-5" />
  </button>
);

export const EditorToolbar: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [isLink, setIsLink] = React.useState(false);
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [isStrikethrough, setIsStrikethrough] = React.useState(false);
  const [isCode, setIsCode] = React.useState(false);

  React.useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // Update format states
        setIsBold(selection.hasFormat('bold'));
        setIsItalic(selection.hasFormat('italic'));
        setIsUnderline(selection.hasFormat('underline'));
        setIsStrikethrough(selection.hasFormat('strikethrough'));
        setIsCode(selection.hasFormat('code'));

        // Check if selection contains link
        const node = selection.anchor.getNode();
        setIsLink($isLinkNode(node) || $isLinkNode(node.getParent()));
      });
    });
  }, [editor]);

  const insertLink = React.useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'link');
    } else {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'unlink');
    }
  }, [editor, isLink]);

  return (
    <div className="editor-toolbar border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1">
      <div className="flex items-center space-x-1 mr-4">
        <ToolbarButton
          icon="undo"
          label="Undo"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        />
        <ToolbarButton
          icon="redo"
          label="Redo"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        />
      </div>

      <div className="flex items-center space-x-1 mr-4">
        <ToolbarButton
          icon="bold"
          label="Bold"
          active={isBold}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        />
        <ToolbarButton
          icon="italic"
          label="Italic"
          active={isItalic}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        />
        <ToolbarButton
          icon="underline"
          label="Underline"
          active={isUnderline}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        />
        <ToolbarButton
          icon="strikethrough"
          label="Strikethrough"
          active={isStrikethrough}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        />
      </div>

      <div className="flex items-center space-x-1 mr-4">
        <ToolbarButton
          icon="list"
          label="Bullet List"
          onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        />
        <ToolbarButton
          icon="list-ordered"
          label="Numbered List"
          onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        />
      </div>

      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon="link"
          label="Insert Link"
          active={isLink}
          onClick={insertLink}
        />
        <ToolbarButton
          icon="code"
          label="Code"
          active={isCode}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        />
      </div>
    </div>
  );
};