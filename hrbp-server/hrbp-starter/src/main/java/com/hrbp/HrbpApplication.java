package com.hrbp;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.hrbp.domain.**.mapper")
public class HrbpApplication {
    public static void main(String[] args) {
        SpringApplication.run(HrbpApplication.class, args);
    }
}
