package com.example.ide.repositories;

import com.example.ide.models.FileItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileItemRepository extends JpaRepository<FileItem, String> {
    List<FileItem> findByProjectId(String projectId);
    List<FileItem> findByParentId(String parentId);
}
