import { FileItem } from "@/react-app/types/ide";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/react-app/components/ui/context-menu";
import { FilePlus, FolderPlus, Pencil, Trash2, Copy } from "lucide-react";

interface FileContextMenuProps {
  item: FileItem;
  children: React.ReactNode;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onDuplicate: (item: FileItem) => void;
}

export default function FileContextMenu({
  item,
  children,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
}: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-ide-sidebar border-ide-border">
        {item.type === "folder" && (
          <>
            <ContextMenuItem
              onClick={() => onNewFile(item.id)}
              className="gap-2 cursor-pointer text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover"
            >
              <FilePlus className="w-4 h-4" />
              New File
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onNewFolder(item.id)}
              className="gap-2 cursor-pointer text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-ide-border" />
          </>
        )}
        {item.type === "file" && (
          <>
            <ContextMenuItem
              onClick={() => onDuplicate(item)}
              className="gap-2 cursor-pointer text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-ide-border" />
          </>
        )}
        <ContextMenuItem
          onClick={() => onRename(item)}
          className="gap-2 cursor-pointer text-ide-text-primary hover:bg-ide-hover focus:bg-ide-hover"
        >
          <Pencil className="w-4 h-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-ide-border" />
        <ContextMenuItem
          onClick={() => onDelete(item)}
          className="gap-2 cursor-pointer text-red-400 hover:bg-ide-hover focus:bg-ide-hover hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
