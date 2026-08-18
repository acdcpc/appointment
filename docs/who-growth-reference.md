# WHO Growth Reference Implementation Note

## Official sources consulted

- [WHO Child Growth Standards](https://www.who.int/tools/child-growth-standards/standards) documents the standards and lists length/height-for-age and weight-for-age indicators.
- [WHO Length/height-for-age](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age) provides sex-specific percentile and z-score charts/tables from birth through five years, including downloadable Excel tables.
- [WHO Weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age) provides sex-specific percentile and z-score charts/tables from birth through five years, including downloadable Excel tables.
- [WHO Height-for-age, 5–19 years](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/height-for-age) provides sex-specific charts and tables for the older age range.

## Product guardrails

Use only the correct age- and sex-specific official dataset in a production feature. Display reference curves as visual context, retain observed measurements as distinct data points, and label the chart as non-diagnostic. Do not calculate clinical interpretations, diagnoses, treatment recommendations, or percentile claims unless validated child sex and precise age data are collected and the calculation is clinically governed.

The current prototype lacks the validated sex and exact measurement-age inputs needed to safely derive patient-specific WHO percentile curves. The clinician dashboard therefore links its reference view to the appropriate WHO source and continues to plot only observed measurements until those fields are collected and governed.
