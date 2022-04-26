DROP DATABASE IF EXISTS movie_post_project;
CREATE DATABASE movie_post_project;

use movie_post_project;

CREATE TABLE `users` (
    `username` varchar(30) NOT NULL,
    `password` varchar(255) NOT NULL,
    PRIMARY KEY (`username`)
);


CREATE TABLE `posts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `movie_title` varchar(30) NOT NULL,
    `content` varchar(255) NOT NULL,
    `author` varchar(255) NOT NULL,
    `creation_time` DATETIME DEFAULT NOW(),
    CONSTRAINT FK_author FOREIGN KEY (author)
    REFERENCES users(username)
);
