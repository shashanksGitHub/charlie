/**
 * Professional Personality Descriptions Service
 * 
 * Provides comprehensive, score-based personality analysis similar to professional
 * psychological assessments. Based on the Big 5 Aspects Scale model.
 */

export type PercentileRange = 
  | 'exceptionally_low'    // 0-4th percentile
  | 'very_low'            // 5-15th percentile  
  | 'low'                 // 16-25th percentile
  | 'moderately_low'      // 26-40th percentile
  | 'typical'             // 41-60th percentile
  | 'moderately_high'     // 61-75th percentile
  | 'high'               // 76-85th percentile
  | 'very_high'          // 86-95th percentile
  | 'exceptionally_high'; // 96-100th percentile

export interface AspectAnalysis {
  name: string;
  percentile: number;
  level: PercentileRange;
  levelLabel: string;
  description: string;
  characteristics: string[];
  advantages: string[];
  challenges: string[];
  relationshipStyle: string;
  careerImplications: string;
}

export interface TraitAnalysis {
  name: string;
  percentile: number;
  level: PercentileRange;
  levelLabel: string;
  overview: string;
  aspects: [AspectAnalysis, AspectAnalysis];
  genderNotes?: string;
  politicalTendencies?: string;
}

class PersonalityDescriptionsService {
  
  /**
   * Determine percentile range category
   */
  private getPercentileRange(percentile: number): PercentileRange {
    if (percentile <= 4) return 'exceptionally_low';
    if (percentile <= 15) return 'very_low';
    if (percentile <= 25) return 'low';
    if (percentile <= 40) return 'moderately_low';
    if (percentile <= 60) return 'typical';
    if (percentile <= 75) return 'moderately_high';
    if (percentile <= 85) return 'high';
    if (percentile <= 95) return 'very_high';
    return 'exceptionally_high';
  }

  /**
   * Get human-readable level label
   */
  private getLevelLabel(range: PercentileRange): string {
    const labels = {
      'exceptionally_low': 'Exceptionally Low',
      'very_low': 'Very Low',
      'low': 'Low', 
      'moderately_low': 'Moderately Low',
      'typical': 'Typical or Average',
      'moderately_high': 'Moderately High',
      'high': 'High',
      'very_high': 'Very High',
      'exceptionally_high': 'Exceptionally High'
    };
    return labels[range];
  }

  /**
   * Generate detailed Openness analysis
   */
  private generateOpennessAnalysis(
    intellectPercentile: number, 
    aestheticsPercentile: number
  ): TraitAnalysis {
    const traitPercentile = (intellectPercentile + aestheticsPercentile) / 2;
    const traitLevel = this.getPercentileRange(traitPercentile);
    
    // Overview descriptions for Openness trait levels
    const overviewDescriptions = {
      'exceptionally_low': 'You are exceptionally low in openness to experience. You strongly prefer familiar routines, traditional approaches, and practical solutions over abstract or innovative ideas.',
      'very_low': 'You are very low in openness to experience. You tend to be conventional, preferring tried-and-true methods and showing little interest in abstract concepts or artistic pursuits.',
      'low': 'You are low in openness to experience. You are generally practical and traditional, preferring concrete over abstract thinking and familiar approaches over novel ones.',
      'moderately_low': 'You are moderately low in openness to experience. While you can appreciate some new ideas, you generally prefer conventional approaches and practical solutions.',
      'typical': 'You are typical in openness to experience. You maintain a balance between traditional and innovative approaches, showing interest in both practical and creative pursuits.',
      'moderately_high': 'You are moderately high in openness to experience. You enjoy exploring new ideas and creative pursuits while maintaining some appreciation for traditional approaches.',
      'high': 'You are high in openness to experience. You actively seek out new experiences, enjoy abstract thinking, and have strong interests in creative and intellectual pursuits.',
      'very_high': 'You are very high in openness to experience. You are highly creative, intellectually curious, and constantly seeking novel experiences and innovative approaches.',
      'exceptionally_high': 'You are exceptionally high in openness to experience. You have an extraordinary appetite for novelty, creativity, and intellectual exploration, often preferring the unconventional.'
    };

    return {
      name: 'Openness',
      percentile: traitPercentile,
      level: traitLevel,
      levelLabel: this.getLevelLabel(traitLevel),
      overview: overviewDescriptions[traitLevel],
      aspects: [
        this.generateIntellectAnalysis(intellectPercentile),
        this.generateAestheticsAnalysis(aestheticsPercentile)
      ],
      politicalTendencies: traitPercentile > 60 ? 
        'People higher in openness tend to be more liberal in their political views, embracing social change and progressive policies.' :
        'People lower in openness tend to be more conservative, preferring traditional values and established social structures.'
    };
  }

  /**
   * Generate Intellect aspect analysis
   */
  private generateIntellectAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You show exceptionally low intellectual curiosity. You strongly avoid complex ideas, preferring straightforward, practical thinking. Abstract concepts and theoretical discussions hold little appeal for you.',
      'very_low': 'You have very low interest in intellectual pursuits. You prefer practical, concrete thinking over abstract ideas and rarely engage with complex theoretical concepts.',
      'low': 'You are low in intellectual curiosity. You tend to focus on practical, straightforward approaches rather than complex ideas or abstract thinking.',
      'moderately_low': 'You are moderately low in intellectual curiosity. While you can handle some complex ideas, you generally prefer practical, concrete approaches to problem-solving.',
      'typical': 'You show typical levels of intellectual curiosity. You can engage with both practical and abstract ideas, maintaining a balance between concrete and theoretical thinking.',
      'moderately_high': 'You are moderately high in intellectual curiosity. You enjoy exploring complex ideas and engaging with abstract concepts while maintaining practical sensibilities.',
      'high': 'You are high in intellectual curiosity. You actively seek out complex ideas, enjoy abstract thinking, and have a strong appetite for learning and intellectual challenge.',
      'very_high': 'You are very high in intellectual curiosity. You have a profound love of learning, consistently seek out complex ideas, and thrive on intellectual challenges.',
      'exceptionally_high': 'You show exceptional intellectual curiosity. You have an extraordinary appetite for complex ideas, abstract thinking, and intellectual exploration that sets you apart from others.'
    };

    const characteristics = {
      'exceptionally_low': ['Avoids complex ideas', 'Prefers simple solutions', 'Dislikes abstract thinking', 'Focuses on immediate practical concerns'],
      'very_low': ['Prefers concrete thinking', 'Avoids theoretical discussions', 'Values practical over intellectual pursuits', 'Limited interest in learning for its own sake'],
      'low': ['Practical problem-solver', 'Prefers straightforward approaches', 'Limited interest in abstract concepts', 'Values common sense over theory'],
      'moderately_low': ['Generally practical', 'Can handle some complexity', 'Prefers proven methods', 'Moderate interest in learning'],
      'typical': ['Balanced thinking style', 'Comfortable with moderate complexity', 'Appreciates both practical and abstract ideas', 'Reasonable curiosity about new concepts'],
      'moderately_high': ['Enjoys intellectual challenges', 'Comfortable with abstract concepts', 'Strong learning motivation', 'Values both theory and practice'],
      'high': ['Highly intellectually curious', 'Seeks out complex ideas', 'Enjoys abstract thinking', 'Strong drive to understand'],
      'very_high': ['Exceptional intellectual appetite', 'Thrives on complexity', 'Deeply curious about ideas', 'Constantly seeking to learn'],
      'exceptionally_high': ['Extraordinary intellectual curiosity', 'Masters complex concepts easily', 'Prefers abstract over concrete', 'Insatiable appetite for knowledge']
    };

    return {
      name: 'Intellect',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: characteristics[level],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Practical problem-solving', 'Focus on immediate concerns', 'Clear, straightforward communication', 'Efficient decision-making'] :
        ['Strong analytical skills', 'Enjoys learning', 'Good at abstract thinking', 'Intellectually curious'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May miss innovative solutions', 'Limited interest in complex ideas', 'May undervalue intellectual pursuits'] :
        ['May overthink simple problems', 'Can get lost in abstract concepts', 'May undervalue practical considerations'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You prefer straightforward communication and practical discussions in relationships, avoiding overly complex emotional or philosophical conversations.' :
        'You enjoy intellectually stimulating conversations and value partners who can engage with complex ideas and abstract concepts.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in practical, hands-on roles that require straightforward problem-solving and concrete thinking rather than abstract analysis.' :
        'You thrive in intellectually demanding careers that involve analysis, research, strategy, or creative problem-solving.'
    };
  }

  /**
   * Generate Aesthetics aspect analysis
   */
  private generateAestheticsAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You have exceptionally low interest in aesthetic experiences. Art, beauty, and creative expression hold little appeal for you, and you prefer functional over decorative elements.',
      'very_low': 'You have very low interest in aesthetics and beauty. You rarely notice or appreciate artistic elements and prefer practical, functional environments over decorative ones.',
      'low': 'You are low in aesthetic appreciation. You tend to focus on functionality over beauty and have limited interest in art, design, or creative expression.',
      'moderately_low': 'You are moderately low in aesthetic interest. While you can appreciate some beautiful things, you generally prioritize function over form.',
      'typical': 'You show typical levels of aesthetic appreciation. You can enjoy beauty and art while maintaining practical sensibilities about design and creative expression.',
      'moderately_high': 'You are moderately high in aesthetic appreciation. You enjoy beauty, art, and creative expression and often seek out aesthetically pleasing experiences.',
      'high': 'You are high in aesthetic appreciation. You have a strong sensitivity to beauty, enjoy artistic experiences, and value creative and aesthetic elements in your environment.',
      'very_high': 'You are very high in aesthetic appreciation. You have exceptional sensitivity to beauty and art, and aesthetic experiences play a significant role in your life.',
      'exceptionally_high': 'You show exceptional aesthetic sensitivity. You have an extraordinary appreciation for beauty, art, and creative expression that deeply influences how you experience the world.'
    };

    return {
      name: 'Aesthetics',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Prefers function over form', 'Limited interest in art', 'Practical aesthetic choices', 'Focuses on utility'] :
        ['Strong aesthetic sensitivity', 'Appreciates beauty and art', 'Values creative expression', 'Notices aesthetic details'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Practical decision-making', 'Cost-effective choices', 'Focus on functionality', 'Efficient use of resources'] :
        ['Rich appreciation of beauty', 'Creative perspective', 'Enhanced life experiences', 'Artistic sensitivity'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May miss aesthetic value', 'Limited creative expression', 'May undervalue art and beauty'] :
        ['May prioritize form over function', 'Can be particular about aesthetics', 'May spend more on aesthetic appeal'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You focus on practical aspects of relationships and living arrangements, paying less attention to romantic or aesthetic elements.' :
        'You appreciate beauty and artistic elements in relationships, valuing aesthetic harmony and creative shared experiences.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in practical, utility-focused careers where function and efficiency matter more than aesthetic considerations.' :
        'You thrive in creative fields, design-oriented roles, or any career where aesthetic judgment and artistic sensitivity are valued.'
    };
  }

  /**
   * Generate detailed Agreeableness analysis
   */
  private generateAgreeablenessAnalysis(
    compassionPercentile: number, 
    politenessPercentile: number
  ): TraitAnalysis {
    const traitPercentile = (compassionPercentile + politenessPercentile) / 2;
    const traitLevel = this.getPercentileRange(traitPercentile);
    
    const overviewDescriptions = {
      'exceptionally_low': 'You are exceptionally low in agreeableness. You are highly competitive, skeptical, and focused on your own interests. You tend to be straightforward and blunt in your interactions.',
      'very_low': 'You are very low in agreeableness. You tend to be competitive, skeptical, and more focused on your own needs than others\' feelings. You value honesty over harmony.',
      'low': 'You are low in agreeableness. You tend to be somewhat competitive and skeptical, preferring direct communication over diplomatic approaches.',
      'moderately_low': 'You are moderately low in agreeableness. You balance self-interest with some concern for others, but tend to be fairly direct in your approach.',
      'typical': 'You are typical in agreeableness. You maintain a healthy balance between cooperation and self-advocacy, adapting your approach based on the situation.',
      'moderately_high': 'You are moderately high in agreeableness. You are generally cooperative and considerate, though you can assert yourself when necessary.',
      'high': 'You are high in agreeableness. You are very cooperative, trusting, and concerned about others\' welfare, often putting harmony above conflict.',
      'very_high': 'You are very high in agreeableness. You are exceptionally cooperative, compassionate, and focused on maintaining harmony in relationships.',
      'exceptionally_high': 'You are exceptionally high in agreeableness. You are extraordinarily compassionate and cooperative, sometimes to the point of self-sacrifice.'
    };

    return {
      name: 'Agreeableness',
      percentile: traitPercentile,
      level: traitLevel,
      levelLabel: this.getLevelLabel(traitLevel),
      overview: overviewDescriptions[traitLevel],
      aspects: [
        this.generateCompassionAnalysis(compassionPercentile),
        this.generatePolitenessAnalysis(politenessPercentile)
      ],
      genderNotes: 'Women tend to be higher in agreeableness than men. The mean percentile for women is 61.5, while for men it is 38.5.',
      politicalTendencies: 'Agreeableness has complex political associations. Higher compassion predicts liberal views, while higher politeness predicts conservative views.'
    };
  }

  /**
   * Generate Compassion aspect analysis
   */
  private generateCompassionAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in compassion. You are not easily moved by others\' suffering and tend to prioritize your own needs and interests above those of others.',
      'very_low': 'You are very low in compassion. You are much less concerned about helping other people and are markedly unwilling to sacrifice for others\' comfort.',
      'low': 'You are low in compassion. You tend to focus on your own needs first and are less likely to be moved by others\' difficulties or emotional states.',
      'moderately_low': 'You are moderately low in compassion. While you can feel for others, you generally prioritize your own needs and interests.',
      'typical': 'You show typical levels of compassion. You can empathize with others while maintaining healthy boundaries for your own well-being.',
      'moderately_high': 'You are moderately high in compassion. You genuinely care about others\' welfare and are often willing to help those in need.',
      'high': 'You are high in compassion. You are very empathetic and caring, often putting others\' needs before your own and feeling deeply affected by others\' suffering.',
      'very_high': 'You are very high in compassion. You have exceptional empathy and are deeply moved by others\' suffering, often going to great lengths to help.',
      'exceptionally_high': 'You are exceptionally high in compassion. You have extraordinary empathy and are profoundly affected by others\' suffering, sometimes to your own detriment.'
    };

    return {
      name: 'Compassion',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Focuses on self-interest', 'Not easily moved by suffering', 'Practical about helping others', 'Maintains emotional distance'] :
        ['Highly empathetic', 'Concerned about others\' welfare', 'Willing to help and sacrifice', 'Emotionally responsive to suffering'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Strong self-advocacy', 'Clear boundaries', 'Objective decision-making', 'Less likely to be taken advantage of'] :
        ['Strong relationships', 'Natural caregiver', 'Inspirational to others', 'Creates supportive environments'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May appear cold or uncaring', 'Difficulty building emotional connections', 'May miss others\' emotional needs'] :
        ['May neglect own needs', 'Vulnerable to exploitation', 'Can be overwhelmed by others\' problems', 'Difficulty with necessary confrontation'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You tend to be straightforward and direct in relationships, focusing more on practical support than emotional comfort.' :
        'You are highly attuned to your partner\'s emotional needs and willing to make sacrifices for their happiness and well-being.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in roles requiring objective decision-making, negotiation, or situations where emotional detachment is beneficial.' :
        'You thrive in helping professions, counseling, healthcare, education, or any role focused on supporting others\' well-being.'
    };
  }

  /**
   * Generate Politeness aspect analysis
   */
  private generatePolitenessAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in politeness. You readily challenge authority and are comfortable with confrontation. You may have difficulty with hierarchical structures.',
      'very_low': 'You are very low in politeness. You are not deferential to authority and are markedly willing to push back when challenged.',
      'low': 'You are low in politeness. You tend to be direct and are comfortable challenging others when you disagree, regardless of their position.',
      'moderately_low': 'You are moderately low in politeness. You can be respectful but are willing to speak up and challenge when necessary.',
      'typical': 'You show typical levels of politeness. You can be respectful and deferential when appropriate while also standing up for yourself when needed.',
      'moderately_high': 'You are moderately high in politeness. You tend to be respectful and courteous, preferring diplomatic approaches to conflict.',
      'high': 'You are high in politeness. You are very respectful of authority and social hierarchies, preferring to avoid confrontation when possible.',
      'very_high': 'You are very high in politeness. You are exceptionally deferential and respectful, sometimes avoiding necessary confrontations.',
      'exceptionally_high': 'You are exceptionally high in politeness. You are extraordinarily deferential to authority and may struggle to assert yourself even when appropriate.'
    };

    return {
      name: 'Politeness',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Challenges authority readily', 'Comfortable with confrontation', 'Direct communication style', 'Questions hierarchies'] :
        ['Respectful and courteous', 'Deferential to authority', 'Diplomatic approach', 'Avoids unnecessary conflict'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Strong leadership potential', 'Willing to challenge problems', 'Authentic communication', 'Drives necessary change'] :
        ['Excellent team player', 'Maintains social harmony', 'Respectful relationships', 'Good at following protocols'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May create conflict unnecessarily', 'Difficulty in hierarchical settings', 'Can be seen as disruptive or disrespectful'] :
        ['May avoid necessary confrontations', 'Can be taken advantage of', 'May suppress own needs for harmony', 'Difficulty asserting leadership'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You tend to be direct and honest in relationships, even when it creates temporary conflict, preferring authenticity over harmony.' :
        'You prioritize harmony and respect in relationships, often deferring to your partner and avoiding conflicts that might disrupt peace.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in leadership roles, entrepreneurship, or positions requiring challenge of existing systems and direct communication.' :
        'You thrive in supportive roles, traditional hierarchical structures, customer service, or positions requiring diplomacy and respect for authority.'
    };
  }

  /**
   * Generate detailed Conscientiousness analysis
   */
  private generateConscientiousnessAnalysis(
    industriousnessPercentile: number, 
    orderlinessPercentile: number
  ): TraitAnalysis {
    const traitPercentile = (industriousnessPercentile + orderlinessPercentile) / 2;
    const traitLevel = this.getPercentileRange(traitPercentile);
    
    const overviewDescriptions = {
      'exceptionally_low': 'You are exceptionally low in conscientiousness. You are very spontaneous and flexible, preferring to live in the moment rather than following strict plans or schedules.',
      'very_low': 'You are very low in conscientiousness. You tend to be spontaneous and flexible, with little concern for rigid organization or long-term planning.',
      'low': 'You are low in conscientiousness. You prefer flexibility and spontaneity over rigid structure and planning.',
      'moderately_low': 'You are moderately low in conscientiousness. You balance some organization with flexibility, but generally prefer less structured approaches.',
      'typical': 'You are typical in conscientiousness. You maintain a good balance between organization and flexibility, adapting your approach as needed.',
      'moderately_high': 'You are moderately high in conscientiousness. You tend to be organized and goal-oriented while maintaining some flexibility.',
      'high': 'You are high in conscientiousness. You are very organized, disciplined, and focused on achieving your goals through systematic effort.',
      'very_high': 'You are very high in conscientiousness. You are exceptionally organized, disciplined, and committed to achieving your objectives.',
      'exceptionally_high': 'You are exceptionally high in conscientiousness. You have extraordinary self-discipline and organization, sometimes to the point of rigidity.'
    };

    return {
      name: 'Conscientiousness',
      percentile: traitPercentile,
      level: traitLevel,
      levelLabel: this.getLevelLabel(traitLevel),
      overview: overviewDescriptions[traitLevel],
      aspects: [
        this.generateIndustriousnessAnalysis(industriousnessPercentile),
        this.generateOrderlinessAnalysis(orderlinessPercentile)
      ],
      genderNotes: 'Women are very slightly more conscientious than men. The mean percentile for women is 51.5, while for men it is 49.5.',
      politicalTendencies: 'Lower conscientiousness is associated with liberal political views, especially when combined with high openness. Higher conscientiousness tends toward conservative views.'
    };
  }

  /**
   * Generate Industriousness aspect analysis
   */
  private generateIndustriousnessAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in industriousness. You strongly prioritize leisure and relaxation over work and achievement, and may struggle with motivation for long-term goals.',
      'very_low': 'You are very low in industriousness. You focus less on work than others and are substantially more likely to procrastinate or fail to complete assignments.',
      'low': 'You are low in industriousness. You tend to prioritize fun and relationships over work and are less motivated by achievement.',
      'moderately_low': 'You are moderately low in industriousness. You can work hard when motivated but generally prefer leisure and don\'t mind procrastinating.',
      'typical': 'You show typical levels of industriousness. You can work hard when needed while also valuing leisure and work-life balance.',
      'moderately_high': 'You are moderately high in industriousness. You are generally motivated to work hard and achieve goals while maintaining some work-life balance.',
      'high': 'You are high in industriousness. You are very motivated to work hard and achieve your goals, often prioritizing work over leisure.',
      'very_high': 'You are very high in industriousness. You have exceptional work ethic and are driven to achieve, sometimes at the expense of relaxation.',
      'exceptionally_high': 'You are exceptionally high in industriousness. You have extraordinary drive and work ethic, potentially to the point of workaholism.'
    };

    return {
      name: 'Industriousness',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Prioritizes leisure over work', 'Prone to procrastination', 'Lives in the moment', 'Values work-life balance'] :
        ['Strong work ethic', 'Goal-oriented', 'Persistent and determined', 'Achievement-focused'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Excellent work-life balance', 'Good at relaxation', 'Flexible and adaptable', 'Values relationships and experiences'] :
        ['High achievement potential', 'Strong perseverance', 'Excellent work ethic', 'Goal completion'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May struggle with long-term goals', 'Tendency to procrastinate', 'May underachieve professionally', 'Difficulty with deadlines'] :
        ['Risk of burnout', 'May neglect personal relationships', 'Potential workaholic tendencies', 'May be overly self-critical'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You prioritize spending quality time with loved ones and value relationships over professional achievement in your personal life.' :
        'You may sometimes struggle to balance relationship time with work commitments, but you bring the same dedication to relationships as to goals.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in creative, flexible environments that don\'t require rigid deadlines or intensive long-term planning.' :
        'You thrive in demanding careers requiring persistence, long-term planning, and consistent effort toward challenging goals.'
    };
  }

  /**
   * Generate Orderliness aspect analysis
   */
  private generateOrderlinessAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in orderliness. You are completely comfortable with chaos and disorder, rarely using schedules or organizational systems.',
      'very_low': 'You are very low in orderliness. You are not disturbed by mess and chaos and prefer to take things as they come rather than following plans.',
      'low': 'You are low in orderliness. You don\'t particularly notice or care about disorder and prefer flexibility over rigid organization.',
      'moderately_low': 'You are moderately low in orderliness. You can tolerate some mess and prefer loose organization over rigid systems.',
      'typical': 'You show typical levels of orderliness. You like some organization and routine but can tolerate disruption when necessary.',
      'moderately_high': 'You are moderately high in orderliness. You prefer organized environments and some routine while remaining reasonably flexible.',
      'high': 'You are high in orderliness. You strongly prefer organized, clean environments and like to follow schedules and routines.',
      'very_high': 'You are very high in orderliness. You have a strong need for organization and structure and may be uncomfortable with mess or disorder.',
      'exceptionally_high': 'You are exceptionally high in orderliness. You have an extraordinary need for organization and structure, potentially to the point of rigidity.'
    };

    return {
      name: 'Orderliness',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Comfortable with chaos', 'Flexible and adaptable', 'Doesn\'t notice mess', 'Prefers spontaneity'] :
        ['Highly organized', 'Values cleanliness and order', 'Uses schedules and systems', 'Prefers predictability'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Highly adaptable', 'Tolerates disruption well', 'Creative flexibility', 'Goes with the flow'] :
        ['Excellent organization skills', 'Efficient and systematic', 'Good at planning', 'Creates structured environments'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May struggle with detailed tasks', 'Can appear disorganized to others', 'May lose important items', 'Difficulty with systematic approaches'] :
        ['May be inflexible', 'Can be stressed by disorder', 'May be overly critical of messiness', 'Difficulty adapting to chaos'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You are flexible and adaptable in relationships, not bothered by household disorder or changes in routine.' :
        'You prefer organized, predictable relationship routines and may become stressed when your partner disrupts established order.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in dynamic, unpredictable environments that require adaptability and tolerance for changing conditions.' :
        'You thrive in structured, organized work environments that value systematic approaches, attention to detail, and consistent procedures.'
    };
  }

  /**
   * Generate detailed Extraversion analysis
   */
  private generateExtraversionAnalysis(
    enthusiasmPercentile: number, 
    assertivenessPercentile: number
  ): TraitAnalysis {
    const traitPercentile = (enthusiasmPercentile + assertivenessPercentile) / 2;
    const traitLevel = this.getPercentileRange(traitPercentile);
    
    const overviewDescriptions = {
      'exceptionally_low': 'You are exceptionally low in extraversion. You strongly prefer solitude and quiet environments, finding social interaction draining and preferring internal reflection.',
      'very_low': 'You are very low in extraversion. You are quite introverted, preferring smaller groups and quieter environments over large social gatherings.',
      'low': 'You are low in extraversion. You tend to be more introverted, enjoying solitude and smaller social groups more than large gatherings.',
      'moderately_low': 'You are moderately low in extraversion. You can enjoy social situations but often prefer quieter environments and smaller groups.',
      'typical': 'You are typical in extraversion. You are comfortable in both social and solitary situations, adapting well to different social environments.',
      'moderately_high': 'You are moderately high in extraversion. You generally enjoy social interaction and group activities while also appreciating some alone time.',
      'high': 'You are high in extraversion. You are very social, energetic in group settings, and gain energy from interaction with others.',
      'very_high': 'You are very high in extraversion. You are exceptionally social and energetic, thriving in group settings and social interaction.',
      'exceptionally_high': 'You are exceptionally high in extraversion. You have extraordinary social energy and enthusiasm, potentially feeling uncomfortable in prolonged solitude.'
    };

    return {
      name: 'Extraversion',
      percentile: traitPercentile,
      level: traitLevel,
      levelLabel: this.getLevelLabel(traitLevel),
      overview: overviewDescriptions[traitLevel],
      aspects: [
        this.generateEnthusiasmAnalysis(enthusiasmPercentile),
        this.generateAssertivenessAnalysis(assertivenessPercentile)
      ]
    };
  }

  /**
   * Generate Enthusiasm aspect analysis
   */
  private generateEnthusiasmAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in enthusiasm. You rarely experience high positive emotions and tend to maintain a calm, steady emotional state.',
      'very_low': 'You are very low in enthusiasm. You experience positive emotions less frequently and intensely than most people.',
      'low': 'You are low in enthusiasm. You tend to be more reserved emotionally and don\'t often experience intense positive emotions.',
      'moderately_low': 'You are moderately low in enthusiasm. You experience some positive emotions but generally maintain a more subdued emotional style.',
      'typical': 'You show typical levels of enthusiasm. You experience a normal range of positive emotions and can be enthusiastic when the situation calls for it.',
      'moderately_high': 'You are moderately high in enthusiasm. You often experience positive emotions and can bring energy to social situations.',
      'high': 'You are high in enthusiasm. You frequently experience intense positive emotions and often energize others with your enthusiasm.',
      'very_high': 'You are very high in enthusiasm. You have exceptional positive energy and enthusiasm that strongly influences your interactions.',
      'exceptionally_high': 'You are exceptionally high in enthusiasm. You have extraordinary positive energy and enthusiasm that can be overwhelming to others.'
    };

    return {
      name: 'Enthusiasm',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Emotionally steady', 'Calm demeanor', 'Less reactive to positive events', 'Subdued emotional expression'] :
        ['High positive energy', 'Emotionally expressive', 'Infectious enthusiasm', 'Optimistic outlook'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Emotional stability', 'Good in crisis situations', 'Thoughtful decision-making', 'Calming presence'] :
        ['Motivates others', 'Creates positive atmosphere', 'Resilient optimism', 'Energizing presence'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May appear unenthusiastic', 'Less motivating to others', 'May miss positive opportunities', 'Can seem distant or uninterested'] :
        ['May be overwhelming to others', 'Can be disappointed easily', 'May make impulsive decisions when excited', 'Energy may not be sustainable'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You provide stability and calm in relationships, though partners may sometimes want more emotional enthusiasm from you.' :
        'You bring energy and positivity to relationships, helping create exciting and joyful shared experiences.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in roles requiring steady focus, careful analysis, or calm decision-making under pressure.' :
        'You thrive in roles involving motivation, team building, sales, entertainment, or any position requiring positive energy.'
    };
  }

  /**
   * Generate Assertiveness aspect analysis
   */
  private generateAssertivenessAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in assertiveness. You very rarely take charge or speak up in groups, preferring to follow rather than lead.',
      'very_low': 'You are very low in assertiveness. You tend to be passive in social situations and rarely take leadership roles.',
      'low': 'You are low in assertiveness. You tend to be quiet in groups and don\'t often take charge or speak up.',
      'moderately_low': 'You are moderately low in assertiveness. You can speak up when necessary but generally prefer to let others take the lead.',
      'typical': 'You show typical levels of assertiveness. You can take charge when needed while also being comfortable following others\' lead.',
      'moderately_high': 'You are moderately high in assertiveness. You often speak up and take charge, while still being able to follow when appropriate.',
      'high': 'You are high in assertiveness. You frequently take charge in social situations and are comfortable being the center of attention.',
      'very_high': 'You are very high in assertiveness. You have strong leadership tendencies and often dominate social situations.',
      'exceptionally_high': 'You are exceptionally high in assertiveness. You have overwhelming leadership drive and may dominate others in social situations.'
    };

    return {
      name: 'Assertiveness',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Prefers following to leading', 'Quiet in groups', 'Avoids center of attention', 'Deferential approach'] :
        ['Natural leadership ability', 'Comfortable taking charge', 'Speaks up confidently', 'Influential in groups'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Excellent team member', 'Good listener', 'Supportive of others\' ideas', 'Creates harmony'] :
        ['Strong leadership potential', 'Influential and persuasive', 'Confident in social situations', 'Gets things done'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May not advocate for own needs', 'Ideas may go unheard', 'May be overlooked for leadership', 'Difficulty in conflict situations'] :
        ['May dominate conversations', 'Can appear pushy or aggressive', 'May not listen to others enough', 'Can create conflict'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You tend to be supportive and accommodating in relationships, though you may need to work on expressing your own needs.' :
        'You tend to take charge in relationships and may need to ensure you give your partner space to lead and express themselves.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in supportive roles, technical positions, or careers where following detailed instructions and supporting others is valued.' :
        'You thrive in leadership positions, sales, management, or any career requiring confidence, influence, and the ability to take charge.'
    };
  }

  /**
   * Generate detailed Neuroticism analysis
   */
  private generateNeuroticismAnalysis(
    withdrawalPercentile: number, 
    volatilityPercentile: number
  ): TraitAnalysis {
    const traitPercentile = (withdrawalPercentile + volatilityPercentile) / 2;
    const traitLevel = this.getPercentileRange(traitPercentile);
    
    const overviewDescriptions = {
      'exceptionally_low': 'You are exceptionally low in neuroticism. You have extraordinary emotional stability and resilience, rarely experiencing stress, anxiety, or negative emotions.',
      'very_low': 'You are very low in neuroticism. You are highly emotionally stable and resilient, handling stress and setbacks with remarkable composure.',
      'low': 'You are low in neuroticism. You are generally emotionally stable and don\'t often experience intense negative emotions.',
      'moderately_low': 'You are moderately low in neuroticism. You handle stress reasonably well and maintain emotional stability most of the time.',
      'typical': 'You are typical in neuroticism. You experience a normal range of emotions and handle stress with average resilience.',
      'moderately_high': 'You are moderately high in neuroticism. You may experience stress and negative emotions somewhat more than average.',
      'high': 'You are high in neuroticism. You tend to experience stress, anxiety, and negative emotions more frequently and intensely.',
      'very_high': 'You are very high in neuroticism. You are quite sensitive to stress and prone to experiencing strong negative emotions.',
      'exceptionally_high': 'You are exceptionally high in neuroticism. You are extremely sensitive to stress and may struggle significantly with emotional regulation.'
    };

    return {
      name: 'Neuroticism',
      percentile: traitPercentile,
      level: traitLevel,
      levelLabel: this.getLevelLabel(traitLevel),
      overview: overviewDescriptions[traitLevel],
      aspects: [
        this.generateWithdrawalAnalysis(withdrawalPercentile),
        this.generateVolatilityAnalysis(volatilityPercentile)
      ],
      genderNotes: 'Women tend to be higher in neuroticism than men, though this difference varies significantly across cultures and age groups.'
    };
  }

  /**
   * Generate Withdrawal aspect analysis
   */
  private generateWithdrawalAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in withdrawal. You remain remarkably engaged and active even in stressful situations, rarely withdrawing from challenges.',
      'very_low': 'You are very low in withdrawal. You tend to stay engaged and active when faced with stress or setbacks rather than withdrawing.',
      'low': 'You are low in withdrawal. You generally maintain engagement and don\'t often withdraw when facing difficulties.',
      'moderately_low': 'You are moderately low in withdrawal. You usually stay engaged but may occasionally withdraw when overwhelmed.',
      'typical': 'You show typical levels of withdrawal. You sometimes withdraw when stressed but generally maintain reasonable engagement.',
      'moderately_high': 'You are moderately high in withdrawal. You tend to withdraw more than average when faced with stress or challenges.',
      'high': 'You are high in withdrawal. You often withdraw from stressful situations and may struggle to maintain engagement under pressure.',
      'very_high': 'You are very high in withdrawal. You have a strong tendency to withdraw when faced with stress, criticism, or challenges.',
      'exceptionally_high': 'You are exceptionally high in withdrawal. You have an overwhelming tendency to withdraw from stressful situations, potentially becoming isolated.'
    };

    return {
      name: 'Withdrawal',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Stays engaged under stress', 'Faces challenges directly', 'Maintains social connection', 'Resilient under pressure'] :
        ['Tends to withdraw when stressed', 'Seeks solitude during difficulties', 'May isolate when overwhelmed', 'Sensitive to criticism'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Strong resilience', 'Maintains relationships under stress', 'Continues functioning in adversity', 'Natural crisis management'] :
        ['Good self-care instincts', 'Avoids overwhelming situations', 'Takes time to process difficulties', 'Protective of mental health'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May not recognize when rest is needed', 'Could push through problems that need attention', 'May not process emotions fully'] :
        ['May miss opportunities due to withdrawal', 'Can become isolated', 'May avoid necessary confrontations', 'Could limit personal growth'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You remain engaged with your partner even during stressful times, though you may need to learn when some space is healthy.' :
        'You may withdraw from your partner during stressful times, which requires communication about your need for space versus connection.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in high-pressure careers requiring sustained engagement and the ability to function well under continuous stress.' :
        'You thrive in low-pressure environments or roles where you can control your exposure to stress and have autonomy over your schedule.'
    };
  }

  /**
   * Generate Volatility aspect analysis
   */
  private generateVolatilityAnalysis(percentile: number): AspectAnalysis {
    const level = this.getPercentileRange(percentile);
    
    const descriptions = {
      'exceptionally_low': 'You are exceptionally low in volatility. You have extraordinary emotional stability with very consistent moods and reactions.',
      'very_low': 'You are very low in volatility. You have excellent emotional stability and your moods remain quite consistent over time.',
      'low': 'You are low in volatility. You tend to have stable emotions and don\'t experience dramatic mood swings.',
      'moderately_low': 'You are moderately low in volatility. Your emotions are generally stable with occasional fluctuations.',
      'typical': 'You show typical levels of volatility. You experience normal emotional fluctuations and mood changes.',
      'moderately_high': 'You are moderately high in volatility. You may experience more emotional ups and downs than average.',
      'high': 'You are high in volatility. You tend to experience significant emotional fluctuations and mood changes.',
      'very_high': 'You are very high in volatility. You experience frequent and intense emotional fluctuations that can be challenging to manage.',
      'exceptionally_high': 'You are exceptionally high in volatility. You experience extreme emotional fluctuations that may significantly impact your daily functioning.'
    };

    return {
      name: 'Volatility',
      percentile,
      level,
      levelLabel: this.getLevelLabel(level),
      description: descriptions[level],
      characteristics: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Remarkably stable emotions', 'Consistent mood', 'Predictable reactions', 'Even-tempered'] :
        ['Intense emotional experiences', 'Frequent mood changes', 'Emotionally reactive', 'Variable emotional states'],
      advantages: level === 'exceptionally_low' || level === 'very_low' ? 
        ['Excellent emotional regulation', 'Reliable and predictable', 'Good in crisis situations', 'Stable presence for others'] :
        ['Rich emotional experiences', 'Highly responsive to environment', 'Passionate and intense', 'Emotionally authentic'],
      challenges: level === 'exceptionally_low' || level === 'very_low' ? 
        ['May appear emotionally distant', 'Could miss emotional cues', 'May not respond appropriately to emotional situations'] :
        ['Difficult emotional regulation', 'May overwhelm others', 'Inconsistent performance', 'Relationship challenges due to mood swings'],
      relationshipStyle: level === 'exceptionally_low' || level === 'very_low' ? 
        'You provide emotional stability in relationships, though partners may sometimes want more emotional intensity or expression from you.' :
        'You bring emotional intensity to relationships, which can create passion but may also require partners who can handle emotional variability.',
      careerImplications: level === 'exceptionally_low' || level === 'very_low' ? 
        'You excel in careers requiring emotional stability, consistent performance, and calm decision-making under pressure.' :
        'You thrive in creative or dynamic careers where emotional intensity is valued, but may struggle in roles requiring consistent emotional regulation.'
    };
  }

  /**
   * Generate complete detailed analysis for all Big 5 traits
   */
  public generateDetailedAnalysis(aspectPercentiles: Record<string, number>): TraitAnalysis[] {
    return [
      this.generateOpennessAnalysis(
        aspectPercentiles['Intellect'] || 0,
        aspectPercentiles['Aesthetics'] || 0
      ),
      this.generateAgreeablenessAnalysis(
        aspectPercentiles['Compassion'] || 0,
        aspectPercentiles['Politeness'] || 0
      ),
      this.generateConscientiousnessAnalysis(
        aspectPercentiles['Industriousness'] || 0,
        aspectPercentiles['Orderliness'] || 0
      ),
      this.generateExtraversionAnalysis(
        aspectPercentiles['Enthusiasm'] || 0,
        aspectPercentiles['Assertiveness'] || 0
      ),
      this.generateNeuroticismAnalysis(
        aspectPercentiles['Withdrawal'] || 0,
        aspectPercentiles['Volatility'] || 0
      )
    ];
  }
}

// Export singleton instance
export const personalityDescriptionsService = new PersonalityDescriptionsService();
export default personalityDescriptionsService;