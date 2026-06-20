package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CornerPoint struct {
	ID         string     `json:"id" gorm:"primaryKey;type:text"`
	FloorPlanID string    `json:"floorPlanId" gorm:"type:text;index"`
	X          float64    `json:"x"`
	Y          float64    `json:"y"`
	Z          float64    `json:"z"`
	OrderIndex int        `json:"orderIndex"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type FloorPlan struct {
	ID          string        `json:"id" gorm:"primaryKey;type:text"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	WallHeight  float64       `json:"wallHeight"`
	PropertyID  string        `json:"propertyId,omitempty" gorm:"type:text;index"`
	Corners     []CornerPoint `json:"corners" gorm:"foreignKey:FloorPlanID;references:ID"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

type FloorPlanRequest struct {
	Name        string        `json:"name"`
	Description string        `json:"description"`
	WallHeight  float64       `json:"wallHeight"`
	PropertyID  string        `json:"propertyId"`
	Corners     []CornerPoint `json:"corners"`
}

type OptimizeRequest struct {
	Corners    []CornerPoint `json:"corners"`
	WallHeight float64       `json:"wallHeight"`
	Tolerance  float64       `json:"tolerance,omitempty"`
}

type OptimizeResponse struct {
	Valid   bool          `json:"valid"`
	Corners []CornerPoint `json:"corners"`
	Message string        `json:"message,omitempty"`
	Area    float64       `json:"area"`
	Perimeter float64     `json:"perimeter"`
}

func (fp *FloorPlan) BeforeCreate(tx *gorm.DB) error {
	if fp.ID == "" {
		fp.ID = uuid.New().String()
	}
	if fp.WallHeight == 0 {
		fp.WallHeight = 2.8
	}
	for i := range fp.Corners {
		if fp.Corners[i].ID == "" {
			fp.Corners[i].ID = uuid.New().String()
		}
		fp.Corners[i].FloorPlanID = fp.ID
	}
	return nil
}

func (cp *CornerPoint) BeforeCreate(tx *gorm.DB) error {
	if cp.ID == "" {
		cp.ID = uuid.New().String()
	}
	return nil
}
