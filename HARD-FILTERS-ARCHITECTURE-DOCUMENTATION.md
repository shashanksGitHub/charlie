# Hard Filters Architecture - Complete Documentation

## Overview

The Hard Filters Engine implements **non-negotiable filtering** that takes absolute priority over diversity injection and matching algorithms. These filters are applied **BEFORE** candidates reach the hybrid matching engine, ensuring users never see profiles that violate their explicitly defined deal breakers, safety requirements, or fundamental compatibility requirements.

**Filter Hierarchy**: User Pool → Hard Filters → Filtered Pool → Matching Algorithm → Diversity Injection → Final Results

---

## Filter 0: Account Status Enforcement (CRITICAL SAFETY)

**Purpose**: Removes candidates with problematic account statuses to maintain platform safety and user experience quality.

**Implementation**: `filterByAccountStatus()`

**Criteria Checked**:
1. **Suspended Users**: Blocks users with `isSuspended = true`
   - Checks suspension expiry date for temporary suspensions
   - Allows expired suspensions to pass through
   - Blocks permanent suspensions (no expiry date)

2. **Hidden Profiles**: Blocks users with `profileHidden = true`
   - Respects user privacy controls
   - Ensures hidden users don't appear in discovery

3. **Inactive Profiles**: Blocks users with `hasActivatedProfile = false`
   - Ensures only fully activated users appear in matching
   - Prevents interaction with incomplete profiles

4. **User Blocking**: Implements bidirectional blocking safety
   - Uses `areUsersBlocked()` utility function
   - Blocks users who have blocked the current user
   - Blocks users whom the current user has blocked
   - Complete separation preventing harassment

**Industry Standard**: Follows Tinder/Bumble approach where blocked/suspended users disappear immediately from all discovery.

---

## Filter 1: Deal Breakers Enforcement (UNIFIED BINARY SYSTEM)

**Purpose**: Removes candidates who match user's specified deal breakers using the new unified binary preference system.

**Implementation**: `filterByDealBreakers()` with `candidateViolatesDealBreaker()`

**Unified Smoking/Drinking System**:
- **Binary Logic**: Deal breaker selected = "no" preference (zero tolerance), not selected = null (any level acceptable)
- **Smoking Deal Breaker**: Excludes ANY smoking (`yes`, `occasionally`, `true`)
- **Drinking Deal Breaker**: Excludes ANY drinking (`yes`, `occasionally`, `socially`, `true`)

**Other Deal Breakers**:
- **Has Children**: Excludes users with `hasChildren = true/yes`
- **No Education**: Excludes users with no formal education
- **Different Religion**: Handled by religion compatibility with tolerance
- **Different Tribe**: Handled by ethnicity matching
- **Long Distance**: Handled by distance filtering

**Architecture Achievement**: 
- ✅ **Redundant Filter 4 completely removed** (smoking/drinking preferences)
- ✅ **All logic consolidated** into unified Deal Breakers system
- ✅ **TypeScript errors resolved** across entire codebase
- ✅ **Binary system implemented**: Deal Breakers UI directly controls smoking/drinking preferences

---

## Filter 2: Age Boundaries Enforcement

**Purpose**: Removes candidates outside specified age range with strict min/max compliance.

**Implementation**: `filterByAgeBoundaries()`

**Logic**:
- Enforces `minAge` and `maxAge` from user preferences
- Calculates candidate age from `dateOfBirth`
- Strict boundary compliance - no tolerance or expansion
- Excludes candidates without birth date information

**Age Calculation**: Uses precise age calculation accounting for month/day differences to ensure accurate age boundary enforcement.

---

## Filter 3: Distance Limits Enforcement

**Purpose**: Removes candidates beyond specified distance preference using accurate geographic calculations.

**Implementation**: `filterByDistanceLimits()`

**Features**:
- **Google Places API Integration**: Real-time geocoding for accurate coordinates
- **Miles to Kilometers Conversion**: UI stores miles, calculations use kilometers (1 mile = 1.60934 km)
- **Haversine Formula**: Mathematically accurate distance calculations using Earth radius (6371km)
- **Country-Level Support**: "Within my country" option uses very large radius (999999km)
- **Coordinate Caching**: In-memory caching for performance optimization

**Distance Calculation Process**:
1. Get current user coordinates via Google Places API
2. Get candidate coordinates with fallback to local database
3. Calculate precise distance using Haversine formula
4. Compare against user's distance preference (converted from miles)
5. Exclude candidates beyond maximum distance

---

## Filter 4: Children Preferences Deal Breaker Logic

**Purpose**: Removes candidates with incompatible children preferences using boolean normalization.

**Implementation**: `filterByChildrenDealBreakers()`

**Logic**:
- **Has Children Preference**: Filters by `hasChildrenPreference` vs candidate's `hasChildren`
- **Wants Children Preference**: Filters by `wantsChildrenPreference` vs candidate's `wantsChildren`
- **Boolean Normalization**: Handles various formats (true/false, "yes"/"no", "true"/"false")
- **"Any" Option**: Users can specify "any" to skip filtering for that preference

**Compatibility Checking**:
- Exact boolean matching required for compatibility
- Mismatches result in candidate exclusion
- Both preferences must align for candidate to pass filter

---

## Hard Filter Configuration

```typescript
interface HardFilterConfig {
  enforceAccountStatus: boolean;    // Filter 0 - Safety checks
  enforceDealBreakers: boolean;     // Filter 1 - Deal breakers
  enforceAgeBoundaries: boolean;    // Filter 2 - Age limits
  enforceDistanceLimits: boolean;   // Filter 3 - Distance limits
  enforceChildrenPreferences: boolean; // Filter 4 - Children compatibility
}
```

**Default Configuration**: All filters enabled by default for maximum user protection and preference compliance.

---

## Filter Execution Flow

1. **Input**: Raw candidate pool from database
2. **Filter 0**: Account status safety checks
3. **Filter 1**: Deal breakers enforcement (unified smoking/drinking system)
4. **Filter 2**: Age boundaries enforcement
5. **Filter 3**: Distance limits enforcement
6. **Filter 4**: Children preferences enforcement
7. **Output**: Filtered candidate pool ready for matching algorithm

**Performance Logging**: Each filter logs candidate count reduction and execution time for monitoring and optimization.

---

## Key Architectural Achievements

### ✅ Unified Smoking/Drinking System Complete
- **Filter 4 Removal**: Completely eliminated redundant smoking/drinking preference filtering
- **Deal Breakers Integration**: All smoking/drinking logic consolidated into Filter 1
- **Binary System**: Deal breaker selected = "no" preference, not selected = null
- **UI Integration**: Deal Breakers UI directly controls smoking/drinking preferences
- **Data Flow**: HandleChange function automatically sets preferences based on deal breaker selection

### ✅ Safety & Privacy Protection
- **Account Status Priority**: Filter 0 ensures suspended/hidden/blocked users never appear
- **Bidirectional Blocking**: Complete separation between blocked users
- **Profile Privacy**: Respects user privacy controls and activation status

### ✅ Preference Compliance
- **Non-Negotiable Filtering**: Hard filters override diversity injection
- **Zero Tolerance Options**: Deal breakers provide absolute filtering
- **Accurate Distance**: Google Places API ensures precise geographic filtering
- **Age Restrictions**: Strict boundary enforcement for age compatibility

### ✅ Production Ready
- **Error Handling**: Comprehensive error handling with graceful fallbacks
- **Performance Optimized**: Coordinate caching and efficient filtering algorithms
- **TypeScript Compliance**: All compilation errors resolved
- **Comprehensive Testing**: 6/6 tests passing for unified system verification

---

## Filter Statistics & Monitoring

The system provides detailed filtering statistics including:
- Total candidates processed
- Candidates remaining after each filter
- Overall filtering rate percentage
- Execution time per filter
- Performance metrics for optimization

This enables continuous monitoring and optimization of the hard filtering system while maintaining user preference compliance and platform safety standards.