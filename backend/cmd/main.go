package main

import (
	"cw9-backend/internal/database"
	"cw9-backend/internal/handlers"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	err := database.InitDB("")
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	handler := handlers.NewFloorPlanHandler()

	api := r.Group("/api/v1")
	{
		api.GET("/floorplans/default", handler.GetDefault)
		api.GET("/floorplans", handler.GetAll)
		api.GET("/floorplans/:id", handler.GetByID)
		api.POST("/floorplans", handler.Create)
		api.PUT("/floorplans/:id", handler.Update)
		api.DELETE("/floorplans/:id", handler.Delete)
		api.POST("/floorplans/optimize", handler.Optimize)
	}

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"name":   "CW9 FloorPlan API",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("API endpoint: http://localhost:%s/api/v1", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
