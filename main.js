// Global variables
let selectedCharacter = null;
let selectedMeal = null;
let mealData = null;

// Load CSV data
async function loadData(character) {
    const file = character === 'jack' ? 'male.csv' : 'female.csv';
    const data = await d3.csv(file);
    return data;
}

// Character selection
document.querySelectorAll('.character-card').forEach(card => {
    card.addEventListener('click', async () => {
        document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedCharacter = card.dataset.character;
        
        // Load meal data
        mealData = await loadData(selectedCharacter);
        
        // Populate meal dropdown
        const uniqueMeals = [...new Set(mealData.map(d => d.Meal))].filter(Boolean);
        const dropdown = document.getElementById('meal-dropdown');
        dropdown.innerHTML = '<option value="">Choose a meal...</option>' +
            uniqueMeals.map(meal => `<option value="${meal}">${meal}</option>`).join('');
        
        // Show meal section
        document.getElementById('meal-section').classList.remove('hidden');
    });
});

// Meal selection and visualization
document.getElementById('add-to-cart').addEventListener('click', () => {
    const mealSelect = document.getElementById('meal-dropdown');
    selectedMeal = mealSelect.value;
    
    if (selectedMeal) {
        const mealInfo = mealData.find(d => d.Meal === selectedMeal);
        createNutritionChart(mealInfo);
        document.getElementById('nutrition-chart').classList.remove('hidden');
        document.getElementById('glucose-button').classList.remove('hidden');
    }
});

// Create nutrition bar chart
function createNutritionChart(mealInfo) {
    const nutrients = ['Carbs', 'Protein', 'Fat', 'Fiber'];
    const values = [
        +mealInfo.Carbs || 0,
        +mealInfo.Protein || 0,
        +mealInfo.Fat || 0,
        +mealInfo.Fiber || 0
    ];

    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select('#nutrition-bars').html('');

    const svg = d3.select('#nutrition-bars')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(nutrients)
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(values) * 1.2])
        .range([height, 0]);

    // Add bars
    svg.selectAll('rect')
        .data(nutrients)
        .enter()
        .append('rect')
        .attr('x', d => x(d))
        .attr('y', d => y(values[nutrients.indexOf(d)]))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(values[nutrients.indexOf(d)]))
        .attr('fill', '#007bff')
        .on('mouseover', function(event, d) {
            const value = values[nutrients.indexOf(d)];
            const baseline = getBaseline(d);
            const difference = value - baseline;
            const status = difference > 0 ? 'above' : 'below';
            const absDifference = Math.abs(difference);
            
            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            
            tooltip.html(`
                <strong>${d}</strong><br>
                Current: ${value}g<br>
                Baseline: ${baseline}g<br>
                ${absDifference}g ${status} baseline
            `);
        })
        .on('mouseout', function() {
            d3.selectAll('.tooltip').remove();
        });

    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Nutrient Type');

    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Grams (g)');

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`Nutritional Content for ${selectedMeal}`);
}

// Create glucose line chart
function createGlucoseChart(mealInfo) {
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select('#glucose-line').html('');

    const svg = d3.select('#glucose-line')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Filter data for the selected day
    const dayData = mealData.filter(d => d.Timestamp.startsWith(mealInfo.Timestamp.split(' ')[0]));

    // Parse timestamps
    dayData.forEach(d => {
        d.Timestamp = new Date(d.Timestamp);
        d['Dexcom GL'] = +d['Dexcom GL'] || 0;
    });

    const x = d3.scaleTime()
        .domain(d3.extent(dayData, d => d.Timestamp))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(dayData, d => d['Dexcom GL']) * 1.2])
        .range([height, 0]);

    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Time');

    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Glucose Level (mg/dL)');

    // Add Dexcom GL line
    const line = d3.line()
        .x(d => x(d.Timestamp))
        .y(d => y(d['Dexcom GL']));

    svg.append('path')
        .datum(dayData)
        .attr('fill', 'none')
        .attr('stroke', '#28a745')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add annotations for meals
    const meals = dayData.filter(d => d.Meal);
    meals.forEach(meal => {
        // Add vertical line for meal time
        svg.append('line')
            .attr('x1', x(meal.Timestamp))
            .attr('x2', x(meal.Timestamp))
            .attr('y1', y(0))
            .attr('y2', y(d3.max(dayData, d => d['Dexcom GL'])))
            .attr('stroke', '#dc3545')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,4');

        // Add meal label
        svg.append('text')
            .attr('x', x(meal.Timestamp))
            .attr('y', y(0) - 30)  // Moved up by 30 pixels
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .text(meal.Timestamp.getHours() < 12 ? 'Breakfast' : 
                  meal.Timestamp.getHours() < 15 ? 'Lunch' : 
                  meal.Timestamp.getHours() < 19 ? 'Dinner' : 'Snack');
    });

    // Add brushing with tooltip
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', function(event) {
            if (!event.selection) return;
            
            const [x0, x1] = event.selection;
            const selectedData = dayData.filter(d => {
                const xPos = x(d.Timestamp);
                return xPos >= x0 && xPos <= x1;
            });

            // Create tooltip for brushed area
            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');

            const avgGlucose = d3.mean(selectedData, d => d['Dexcom GL']);
            const minGlucose = d3.min(selectedData, d => d['Dexcom GL']);
            const maxGlucose = d3.max(selectedData, d => d['Dexcom GL']);
            
            tooltip.html(`
                Time Range: ${selectedData[0].Timestamp.toLocaleTimeString()} - ${selectedData[selectedData.length-1].Timestamp.toLocaleTimeString()}<br>
                Average Glucose: ${avgGlucose.toFixed(1)} mg/dL<br>
                Min: ${minGlucose.toFixed(1)} mg/dL<br>
                Max: ${maxGlucose.toFixed(1)} mg/dL
            `);

            // Remove tooltip after 2 seconds
            setTimeout(() => {
                tooltip.remove();
            }, 2000);
        });

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Add hover line and tooltip
    const hoverLine = svg.append('line')
        .attr('class', 'hover-line')
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .style('display', 'none');

    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mouseover', function() {
            hoverLine.style('display', null);
        })
        .on('mouseout', function() {
            hoverLine.style('display', 'none');
            d3.selectAll('.tooltip').remove();
        })
        .on('mousemove', function(event) {
            const xPos = d3.pointer(event)[0];
            const xDate = x.invert(xPos);
            
            // Update hover line
            hoverLine
                .attr('x1', xPos)
                .attr('x2', xPos)
                .attr('y1', 0)
                .attr('y2', height);

            // Find closest data point
            const bisect = d3.bisector(d => d.Timestamp).left;
            const i = bisect(dayData, xDate, 1);
            const d0 = dayData[i - 1];
            const d1 = dayData[i];
            const d = xDate - d0.Timestamp > d1.Timestamp - xDate ? d1 : d0;

            // Remove any existing tooltip before creating a new one
            d3.selectAll('.tooltip').remove();

            // Update tooltip
            const tooltip = d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');

            tooltip.html(`
                Time: ${d.Timestamp.toLocaleTimeString()}<br>
                Glucose: ${d['Dexcom GL'].toFixed(1)} mg/dL
            `);
        });

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`${selectedCharacter === 'jack' ? "Jack's" : "Jill's"} Glucose Levels Throughout the Day`);
}

// Helper function to get baseline values
function getBaseline(nutrient) {
    const baselines = {
        'Carbs': 45,
        'Protein': 20,
        'Fat': 15,
        'Fiber': 25
    };
    return baselines[nutrient];
}

// Try again button
document.getElementById('try-again').addEventListener('click', () => {
    window.scrollTo(0, 0);
    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('meal-section').classList.add('hidden');
    document.getElementById('nutrition-chart').classList.add('hidden');
    document.getElementById('glucose-chart').classList.add('hidden');
    document.getElementById('glucose-button').classList.add('hidden');
    document.getElementById('conclusion').classList.add('hidden');
    selectedCharacter = null;
    selectedMeal = null;
});

// Add event listener for glucose button
document.getElementById('glucose-button').addEventListener('click', () => {
    const mealInfo = mealData.find(d => d.Meal === selectedMeal);
    createGlucoseChart(mealInfo);
    document.getElementById('glucose-chart').classList.remove('hidden');
    document.getElementById('conclusion').classList.remove('hidden');
}); 