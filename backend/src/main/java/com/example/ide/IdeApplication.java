package com.example.ide;

import com.example.ide.models.Project;
import com.example.ide.repositories.ProjectRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class IdeApplication {

	public static void main(String[] args) {
		SpringApplication.run(IdeApplication.class, args);
	}

	@Bean
	public CommandLineRunner dataSeeder(ProjectRepository repository) {
		return args -> {
			if (repository.findAll().isEmpty()) {
				Project p = new Project("redddit-posts-sentiments", "Sentiment analysis of Reddit posts");
				p.setRootPath("./redddit-posts-sentiments");
				repository.save(p);
			}
		};
	}
}
