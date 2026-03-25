import React, { useMemo } from 'react';
import * as diff from 'diff';
import { Check, X } from 'lucide-react';

interface DiffPreviewProps {
  originalContent: string;
  modifiedContent: string;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffPreview({ originalContent, modifiedContent, onAccept, onReject }: DiffPreviewProps) {
  const diffParts = useMemo(() => {
    return diff.diffLines(originalContent, modifiedContent);
  }, [originalContent, modifiedContent]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-[#333] rounded-md overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-gray-300 font-medium">Review Changes</span>
        <div className="flex gap-2">
          <button className="h-7 px-3 flex items-center text-xs font-medium rounded-md text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors" onClick={onReject}>
            <X className="w-4 h-4 mr-1" /> Reject
          </button>
          <button className="h-7 px-3 flex items-center text-xs font-medium rounded-md text-green-400 hover:text-green-300 hover:bg-green-400/10 transition-colors" onClick={onAccept}>
            <Check className="w-4 h-4 mr-1" /> Accept
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto custom-scrollbar">
        <pre className="m-0 leading-relaxed font-mono">
          {diffParts.map((part: diff.Change, index: number) => {
            let bgColor = 'transparent';
            let color = '#d4d4d4';
            let prefix = '  ';

            if (part.added) {
              bgColor = 'rgba(46, 160, 67, 0.15)';
              color = '#4ade80';
              prefix = '+ ';
            } else if (part.removed) {
              bgColor = 'rgba(248, 81, 73, 0.15)';
              color = '#f87171';
              prefix = '- ';
            }

            return (
              <div 
                key={index} 
                style={{ backgroundColor: bgColor, color }} 
                className="px-2 block whitespace-pre-wrap"
              >
                {part.value.split('\n').map((line: string, i: number) => {
                  if (i === part.value.split('\n').length - 1 && line === '') return null;
                  return (
                    <div key={i} className="flex">
                      <span className="select-none opacity-50 w-6 text-right mr-3">{prefix}</span>
                      <span>{line}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
