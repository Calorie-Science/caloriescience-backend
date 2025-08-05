graph TD
    A[Flutter App<br/>📱 Mobile] --> B[ClientMobileBFF<br/>CalorieScience Team]
    C[Web App<br/>🌐 Nutritionist] --> D[NutritionistWebBFF<br/>TericSoft Team]
    
    B --> E[Core Services<br/>TericSoft Team]
    D --> E
    
    E --> F[• Clients<br/>• Payments<br/>• Meal Plans<br/>• Nutrition Data]
    
    style A fill:#e1f5fe
    style B fill:#c8e6c9
    style C fill:#fff3e0
    style D fill:#fff3e0
    style E fill:#ffecb3
    style F fill:#f3e5f5
    
    classDef caloriescience fill:#c8e6c9,stroke:#4caf50,stroke-width:2px
    classDef tericsoft fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    
    class A,B caloriescience
    class C,D,E,F tericsoft

## CalorieScience Mobile App - BFF Architecture

### Team Ownership:
- **Green**: CalorieScience Team
- **Orange**: TericSoft Team

### API Flow:
```
Flutter App → ClientMobileBFF → Core Services
Web App → NutritionistWebBFF → Core Services
```

### Key Benefits:
- **Independence**: CalorieScience controls mobile experience
- **Optimization**: BFF tailored for mobile needs  
- **Separation**: Clear boundaries between teams
- **Scalability**: Add features without backend changes 