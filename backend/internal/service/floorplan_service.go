package service

import (
	"cw9-backend/internal/database"
	"cw9-backend/internal/models"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FloorPlanService struct{}

func NewFloorPlanService() *FloorPlanService {
	return &FloorPlanService{}
}

func (s *FloorPlanService) GetAll() ([]models.FloorPlan, error) {
	var floorPlans []models.FloorPlan
	db := database.GetDB()
	err := db.Preload("Corners", func(db *gorm.DB) *gorm.DB {
		return db.Order("order_index ASC")
	}).Find(&floorPlans).Error
	if err != nil {
		return nil, err
	}
	return floorPlans, nil
}

func (s *FloorPlanService) GetByID(id string) (*models.FloorPlan, error) {
	var floorPlan models.FloorPlan
	db := database.GetDB()
	err := db.Preload("Corners", func(db *gorm.DB) *gorm.DB {
		return db.Order("order_index ASC")
	}).First(&floorPlan, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("户型不存在")
		}
		return nil, err
	}
	return &floorPlan, nil
}

func (s *FloorPlanService) Create(req models.FloorPlanRequest) (*models.FloorPlan, error) {
	floorPlan := models.FloorPlan{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		WallHeight:  req.WallHeight,
		PropertyID:  req.PropertyID,
		Corners:     make([]models.CornerPoint, len(req.Corners)),
	}

	for i, c := range req.Corners {
		floorPlan.Corners[i] = models.CornerPoint{
			ID:          uuid.New().String(),
			FloorPlanID: floorPlan.ID,
			X:           c.X,
			Y:           0,
			Z:           c.Z,
			OrderIndex:  c.OrderIndex,
		}
	}

	if err := ValidateFloorPlan(&floorPlan); err != nil {
		return nil, err
	}

	optResult := OptimizeCorners(floorPlan.Corners, 0.05)
	if !optResult.Valid {
		return nil, errors.New(optResult.Message)
	}
	optimizedCorners := optResult.Corners
	floorPlan.Corners = nil

	db := database.GetDB()
	tx := db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	if err := tx.Create(&floorPlan).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	for i := range optimizedCorners {
		optimizedCorners[i].ID = ""
		optimizedCorners[i].FloorPlanID = floorPlan.ID
		optimizedCorners[i].OrderIndex = i
		optimizedCorners[i].Y = 0
		if err := tx.Create(&optimizedCorners[i]).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	floorPlan.Corners = optimizedCorners
	return &floorPlan, nil
}

func (s *FloorPlanService) Update(id string, req models.FloorPlanRequest) (*models.FloorPlan, error) {
	db := database.GetDB()
	var existing models.FloorPlan
	err := db.Preload("Corners").First(&existing, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("户型不存在")
		}
		return nil, err
	}

	existing.Name = req.Name
	existing.Description = req.Description
	existing.WallHeight = req.WallHeight
	if req.PropertyID != "" {
		existing.PropertyID = req.PropertyID
	}

	newCorners := make([]models.CornerPoint, len(req.Corners))
	for i, c := range req.Corners {
		cornerID := c.ID
		if cornerID == "" {
			cornerID = uuid.New().String()
		}
		newCorners[i] = models.CornerPoint{
			ID:          cornerID,
			FloorPlanID: existing.ID,
			X:           c.X,
			Y:           0,
			Z:           c.Z,
			OrderIndex:  c.OrderIndex,
		}
	}

	if err := ValidateFloorPlan(&models.FloorPlan{WallHeight: existing.WallHeight, Corners: newCorners}); err != nil {
		return nil, err
	}

	optResult := OptimizeCorners(newCorners, 0.05)
	if !optResult.Valid {
		return nil, errors.New(optResult.Message)
	}
	newCorners = optResult.Corners

	tx := db.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	if err := tx.Where("floor_plan_id = ?", existing.ID).Delete(&models.CornerPoint{}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	for i := range newCorners {
		newCorners[i].ID = ""
		newCorners[i].FloorPlanID = existing.ID
		newCorners[i].OrderIndex = i
		newCorners[i].Y = 0
		if err := tx.Create(&newCorners[i]).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Save(&existing).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	existing.Corners = newCorners
	return &existing, nil
}

func (s *FloorPlanService) Delete(id string) error {
	db := database.GetDB()
	tx := db.Begin()
	if tx.Error != nil {
		return tx.Error
	}

	if err := tx.Where("floor_plan_id = ?", id).Delete(&models.CornerPoint{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	result := tx.Where("id = ?", id).Delete(&models.FloorPlan{})
	if result.Error != nil {
		tx.Rollback()
		return result.Error
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		return errors.New("户型不存在")
	}

	return tx.Commit().Error
}
