package utils

import (
	"math"
)

func RoundTo(value float64, tolerance float64) float64 {
	if tolerance <= 0 {
		return value
	}
	inverse := 1.0 / tolerance
	return math.Round(value*inverse) / inverse
}

func Distance2D(x1, z1, x2, z2 float64) float64 {
	return math.Hypot(x2-x1, z2-z1)
}

func Distance3D(x1, y1, z1, x2, y2, z2 float64) float64 {
	return math.Sqrt(math.Pow(x2-x1, 2) + math.Pow(y2-y1, 2) + math.Pow(z2-z1, 2))
}

func Lerp(a, b, t float64) float64 {
	return a + (b-a)*t
}

func Clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
