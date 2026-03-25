package com.example.ide.ai;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.Patch;
import com.github.difflib.UnifiedDiffUtils;

import java.util.Arrays;
import java.util.List;

public class DiffUtil {
    
    public static String applyDiff(String original, String diffPatch) {
        if (diffPatch != null && !diffPatch.isEmpty()) {
            try {
                List<String> originalLines = Arrays.asList(original.split("\r?\n"));
                List<String> patchLines = Arrays.asList(diffPatch.split("\r?\n"));
                
                Patch<String> patch = UnifiedDiffUtils.parseUnifiedDiff(patchLines);
                List<String> patchedLines = DiffUtils.patch(originalLines, patch);
                
                return String.join("\n", patchedLines);
            } catch (Exception e) {
                System.err.println("Failed to apply diff: " + e.getMessage());
                throw new RuntimeException("Failed to apply unified diff. Ensure diff has valid headers (--- a/file +++ b/file): " + e.getMessage(), e);
            }
        }
        return original;
    }
}
