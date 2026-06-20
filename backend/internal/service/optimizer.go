package service

import (
	"cw9-backend/internal/models"
	"cw9-backend/pkg/utils"
	"errors"
	"math"
	"sort"
)

const (
	DefaultTolerance = 0.05
	MinArea          = 1.0
	MinWallLength    = 0.3
	MinCornerCount   = 3
)

func OptimizeCorners(corners []models.CornerPoint, tolerance float64) models.OptimizeResponse {
	if tolerance <= 0 {
		tolerance = DefaultTolerance
	}

	if len(corners) < MinCornerCount {
		return models.OptimizeResponse{
			Valid:   false,
			Corners: corners,
			Message: "至少需要3个角点才能构成户型",
		}
	}

	optimized := make([]models.CornerPoint, len(corners))
	for i, c := range corners {
		optimized[i] = models.CornerPoint{
			ID:          c.ID,
			FloorPlanID: c.FloorPlanID,
			X:           utils.RoundTo(c.X, tolerance),
			Y:           0,
			Z:           utils.RoundTo(c.Z, tolerance),
			OrderIndex:  c.OrderIndex,
		}
	}

	sort.Slice(optimized, func(i, j int) bool {
		return optimized[i].OrderIndex < optimized[j].OrderIndex
	})

	optimized = removeDuplicateCorners(optimized, tolerance)
	optimized = snapToRightAngles(optimized, tolerance)

	if len(optimized) < MinCornerCount {
		return models.OptimizeResponse{
			Valid:   false,
			Corners: optimized,
			Message: "优化后角点数量不足",
		}
	}

	if hasSelfIntersection(optimized) {
		return models.OptimizeResponse{
			Valid:   false,
			Corners: optimized,
			Message: "户型边存在自相交，请调整角点位置",
		}
	}

	area := CalculateArea(optimized)
	if area < MinArea {
		return models.OptimizeResponse{
			Valid:   false,
			Corners: optimized,
			Area:    area,
			Message: "户型面积过小，请调整尺寸",
		}
	}

	perimeter := CalculatePerimeter(optimized)
	shortWall := hasShortWall(optimized, MinWallLength)
	if shortWall {
		return models.OptimizeResponse{
			Valid:     false,
			Corners:   optimized,
			Area:      area,
			Perimeter: perimeter,
			Message:   "存在过短的墙体，请调整",
		}
	}

	if !ensureCounterClockwise(optimized) {
		for i, j := 0, len(optimized)-1; i < j; i, j = i+1, j-1 {
			optimized[i], optimized[j] = optimized[j], optimized[i]
		}
		for i := range optimized {
			optimized[i].OrderIndex = i
		}
	}

	for i := range optimized {
		if !math.IsNaN(optimized[i].X) && !math.IsInf(optimized[i].X, 0) {
			optimized[i].X = math.Max(-1000, math.Min(1000, optimized[i].X))
		} else {
			optimized[i].X = float64(i) * 1.5
		}
		if !math.IsNaN(optimized[i].Z) && !math.IsInf(optimized[i].Z, 0) {
			optimized[i].Z = math.Max(-1000, math.Min(1000, optimized[i].Z))
		} else {
			optimized[i].Z = float64(i) * 1.0
		}
		optimized[i].Y = 0
		optimized[i].OrderIndex = i
	}

	return models.OptimizeResponse{
		Valid:     true,
		Corners:   optimized,
		Area:      area,
		Perimeter: perimeter,
		Message:   "坐标优化完成",
	}
}

func removeDuplicateCorners(corners []models.CornerPoint, tolerance float64) []models.CornerPoint {
	if len(corners) == 0 {
		return corners
	}

	result := []models.CornerPoint{corners[0]}
	for i := 1; i < len(corners); i++ {
		last := result[len(result)-1]
		if !pointsEqual(last, corners[i], tolerance) {
			result = append(result, corners[i])
		}
	}

	if len(result) > 2 && pointsEqual(result[0], result[len(result)-1], tolerance) {
		result = result[:len(result)-1]
	}

	for i := range result {
		result[i].OrderIndex = i
	}
	return result
}

func snapToRightAngles(corners []models.CornerPoint, tolerance float64) []models.CornerPoint {
	result := make([]models.CornerPoint, len(corners))
	copy(result, corners)

	for i := 0; i < len(result); i++ {
		prev := result[(i-1+len(result))%len(result)]
		curr := &result[i]
		next := result[(i+1)%len(result)]

		angle := calculateAngle(prev, *curr, next)
		targetAngles := []float64{0, math.Pi / 2, math.Pi, 3 * math.Pi / 2}
		var closestAngle float64
		minDiff := math.Inf(1)
		for _, ta := range targetAngles {
			diff := math.Abs(angle - ta)
			if diff < minDiff {
				minDiff = diff
				closestAngle = ta
			}
		}

		if minDiff < 0.09 && minDiff > 0.001 {
			snapCornerToAngle(prev, curr, next, closestAngle)
		}
	}
	return result
}

func snapCornerToAngle(prev models.CornerPoint, curr *models.CornerPoint, next models.CornerPoint, targetAngle float64) {
	dir1X := curr.X - prev.X
	dir1Z := curr.Z - prev.Z
	len1 := math.Hypot(dir1X, dir1Z)
	if len1 < 0.001 {
		return
	}
	dir1X /= len1
	dir1Z /= len1

	dir2X := next.X - curr.X
	dir2Z := next.Z - curr.Z
	len2 := math.Hypot(dir2X, dir2Z)
	if len2 < 0.001 {
		return
	}

	switch targetAngle {
	case 0:
		curr.X = (prev.X + next.X) / 2
		curr.Z = (prev.Z + next.Z) / 2
	case math.Pi / 2:
		newDirX := -dir1Z
		newDirZ := dir1X
		proj := dir2X*newDirX + dir2Z*newDirZ
		proj = math.Max(-1000, math.Min(1000, proj))
		curr.X = next.X - newDirX*proj
		curr.Z = next.Z - newDirZ*proj
	case math.Pi:
		curr.X = (prev.X + next.X) / 2
		curr.Z = (prev.Z + next.Z) / 2
	case 3 * math.Pi / 2:
		newDirX := dir1Z
		newDirZ := -dir1X
		proj := dir2X*newDirX + dir2Z*newDirZ
		proj = math.Max(-1000, math.Min(1000, proj))
		curr.X = next.X - newDirX*proj
		curr.Z = next.Z - newDirZ*proj
	}
}

func calculateAngle(p1, p2, p3 models.CornerPoint) float64 {
	v1X := p1.X - p2.X
	v1Z := p1.Z - p2.Z
	v2X := p3.X - p2.X
	v2Z := p3.Z - p2.Z

	cross := v1X*v2Z - v1Z*v2X
	dot := v1X*v2X + v1Z*v2Z

	angle := math.Atan2(cross, dot)
	if angle < 0 {
		angle += 2 * math.Pi
	}
	return angle
}

func pointsEqual(a, b models.CornerPoint, tolerance float64) bool {
	return math.Abs(a.X-b.X) < tolerance && math.Abs(a.Z-b.Z) < tolerance
}

func hasSelfIntersection(corners []models.CornerPoint) bool {
	n := len(corners)
	for i := 0; i < n; i++ {
		for j := i + 2; j < n; j++ {
			if i == 0 && j == n-1 {
				continue
			}
			p1 := corners[i]
			p2 := corners[(i+1)%n]
			p3 := corners[j]
			p4 := corners[(j+1)%n]
			if segmentsIntersect(p1, p2, p3, p4) {
				return true
			}
		}
	}
	return false
}

func segmentsIntersect(p1, p2, p3, p4 models.CornerPoint) bool {
	d1 := direction(p3, p4, p1)
	d2 := direction(p3, p4, p2)
	d3 := direction(p1, p2, p3)
	d4 := direction(p1, p2, p4)

	if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
		((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)) {
		return true
	}

	return false
}

func direction(pi, pj, pk models.CornerPoint) float64 {
	return (pk.X-pi.X)*(pj.Z-pi.Z) - (pj.X-pi.X)*(pk.Z-pi.Z)
}

func CalculateArea(corners []models.CornerPoint) float64 {
	n := len(corners)
	if n < 3 {
		return 0
	}
	area := 0.0
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		area += corners[i].X * corners[j].Z
		area -= corners[j].X * corners[i].Z
	}
	return math.Abs(area) / 2.0
}

func CalculatePerimeter(corners []models.CornerPoint) float64 {
	n := len(corners)
	perimeter := 0.0
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		perimeter += math.Hypot(corners[j].X-corners[i].X, corners[j].Z-corners[i].Z)
	}
	return perimeter
}

func hasShortWall(corners []models.CornerPoint, minLength float64) bool {
	n := len(corners)
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		length := math.Hypot(corners[j].X-corners[i].X, corners[j].Z-corners[i].Z)
		if length < minLength {
			return true
		}
	}
	return false
}

func ensureCounterClockwise(corners []models.CornerPoint) bool {
	n := len(corners)
	sum := 0.0
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		sum += (corners[j].X - corners[i].X) * (corners[j].Z + corners[i].Z)
	}
	return sum < 0
}

func CreateDefaultFloorPlan() models.FloorPlan {
	corners := []models.CornerPoint{
		{X: 0, Y: 0, Z: 0, OrderIndex: 0},
		{X: 6, Y: 0, Z: 0, OrderIndex: 1},
		{X: 6, Y: 0, Z: 4, OrderIndex: 2},
		{X: 0, Y: 0, Z: 4, OrderIndex: 3},
	}
	return models.FloorPlan{
		Name:        "默认户型",
		Description: "初始户型模板",
		WallHeight:  2.8,
		Corners:     corners,
	}
}

func ValidateFloorPlan(fp *models.FloorPlan) error {
	if fp.Name == "" {
		return errors.New("户型名称不能为空")
	}
	if fp.WallHeight <= 0 {
		return errors.New("墙高必须大于0")
	}
	if len(fp.Corners) < MinCornerCount {
		return errors.New("至少需要3个角点")
	}
	return nil
}
