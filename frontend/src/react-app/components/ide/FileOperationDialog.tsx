import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";

interface FileOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "new-file" | "new-folder" | "rename" | "delete";
  initialValue?: string;
  itemName?: string;
  onConfirm: (value: string) => void;
}

export default function FileOperationDialog({
  open,
  onOpenChange,
  mode,
  initialValue = "",
  itemName = "",
  onConfirm,
}: FileOperationDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "delete" || value.trim()) {
      onConfirm(value.trim());
      setValue("");
      onOpenChange(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "new-file":
        return "New File";
      case "new-folder":
        return "New Folder";
      case "rename":
        return "Rename";
      case "delete":
        return "Delete";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "new-file":
        return "Enter a name for the new file";
      case "new-folder":
        return "Enter a name for the new folder";
      case "rename":
        return "Enter a new name";
      case "delete":
        return `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-ide-sidebar border-ide-border">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-ide-text-primary">{getTitle()}</DialogTitle>
            <DialogDescription className="text-ide-text-secondary">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>
          {mode !== "delete" && (
            <div className="py-4">
              <Label htmlFor="name" className="text-ide-text-secondary text-sm">
                Name
              </Label>
              <Input
                ref={inputRef}
                id="name"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="mt-2 bg-ide-bg border-ide-border text-ide-text-primary focus-visible:ring-indigo-500"
                placeholder={
                  mode === "new-file"
                    ? "Enter new file name with extension"
                    : mode === "new-folder"
                      ? "Enter new folder name"
                      : ""
                }
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                mode === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }
              disabled={mode !== "delete" && !value.trim()}
            >
              {mode === "delete" ? "Delete" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
