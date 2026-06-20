package handlers

import (
	"cw9-backend/internal/models"
	"cw9-backend/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type FloorPlanHandler struct {
	service *service.FloorPlanService
}

func NewFloorPlanHandler() *FloorPlanHandler {
	return &FloorPlanHandler{
		service: service.NewFloorPlanService(),
	}
}

func (h *FloorPlanHandler) GetAll(c *gin.Context) {
	floorPlans, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": floorPlans})
}

func (h *FloorPlanHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少ID参数"})
		return
	}
	floorPlan, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": floorPlan})
}

func (h *FloorPlanHandler) Create(c *gin.Context) {
	var req models.FloorPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误: " + err.Error()})
		return
	}
	floorPlan, err := h.service.Create(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": floorPlan})
}

func (h *FloorPlanHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少ID参数"})
		return
	}
	var req models.FloorPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误: " + err.Error()})
		return
	}
	floorPlan, err := h.service.Update(id, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": floorPlan})
}

func (h *FloorPlanHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少ID参数"})
		return
	}
	err := h.service.Delete(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

func (h *FloorPlanHandler) Optimize(c *gin.Context) {
	var req models.OptimizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误: " + err.Error()})
		return
	}
	result := service.OptimizeCorners(req.Corners, req.Tolerance)
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *FloorPlanHandler) GetDefault(c *gin.Context) {
	fp := service.CreateDefaultFloorPlan()
	result := service.OptimizeCorners(fp.Corners, 0.05)
	fp.Corners = result.Corners
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"floorPlan": fp,
			"area":      result.Area,
			"perimeter": result.Perimeter,
		},
	})
}
