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
    const width = 700 - margin.left - margin.right;
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

    // Add gridlines
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .style('color', '#e0e0e0')  // Light gray color
        .style('stroke-dasharray', '2,2');  // Dashed lines

    // Add bars
    svg.selectAll('rect')
        .data(nutrients)
        .enter()
        .append('rect')
        .attr('x', d => x(d))
        .attr('y', d => y(values[nutrients.indexOf(d)]))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(values[nutrients.indexOf(d)]))
        .attr('fill', d => {
            const value = values[nutrients.indexOf(d)];
            const baseline = getBaseline(d);
            const difference = value - baseline;
            if (difference === 0) return '#007bff';  // Blue for exact match
            return difference > 0 ? '#dc3545' : '#6f42c1'; // Red if above baseline, Purple if below
        })
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

    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 0)`);

    // Legend items
    const legendItems = [
        { color: '#dc3545', text: 'Above Baseline' },
        { color: '#007bff', text: 'At Baseline' },
        { color: '#6f42c1', text: 'Below Baseline' }
    ];

    legendItems.forEach((item, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', item.color);

        legendRow.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text(item.text);
    });

    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', '12px');

    // Add x-axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Nutrient');

    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px');

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Grams (g)');

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`Nutritional Content for ${selectedMeal}`);

    // Generate and display takeaway summary
    const takeawayContainer = d3.select('#nutrition-bars')
        .append('div')
        .style('position', 'relative')
        .style('display', 'inline-block')
        .style('vertical-align', 'top')
        .style('margin-left', '20px')
        .style('width', '250px')
        .style('font-size', '14px')
        .style('line-height', '1.5')
        .style('padding', '20px')
        .style('background-color', '#f8f9fa')
        .style('border-radius', '5px')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

    // Analyze nutrient data
    const aboveBaseline = nutrients.filter(n => values[nutrients.indexOf(n)] > getBaseline(n));
    const belowBaseline = nutrients.filter(n => values[nutrients.indexOf(n)] < getBaseline(n));
    const onPar = nutrients.filter(n => values[nutrients.indexOf(n)] === getBaseline(n));

    // Generate summary text
    let summaryText = '';
    
    if (aboveBaseline.length > 0) {
        summaryText += `Your consumption of ${aboveBaseline.join(', ')} is above the baseline. `;
    }
    
    if (belowBaseline.length > 0) {
        summaryText += `Your consumption of ${belowBaseline.join(', ')} is below the baseline. `;
    }
    
    if (onPar.length > 0) {
        summaryText += `There was ${onPar.length} nutrient${onPar.length > 1 ? 's' : ''} which was on par with the recommendations from the National Institute of Health.`;
    }

    // Add summary text to container
    takeawayContainer.append('div')
        .style('font-weight', 'bold')
        .style('margin-bottom', '10px')
        .text('We can conclude the following based on the National Institute of Health\'s recommendations:');

    takeawayContainer.append('div')
        .text(summaryText);
}

// Create glucose line chart
function createGlucoseChart(mealInfo) {
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = 760 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select('#glucose-line').html('');

    // Create container for chart and takeaway
    const container = d3.select('#glucose-line')
        .style('display', 'flex')
        .style('align-items', 'flex-start');

    // Create SVG container
    const svg = container.append('svg')
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
        .selectAll('text')
        .style('text-anchor', 'middle')
        .style('font-size', '12px');

    // Add x-axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Time');

    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px');

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
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
    const meals = dayData.filter(d => d['Meal Type']);
    meals.forEach(meal => {
        const mealType = meal['Meal Type'].toLowerCase();
        // Only process breakfast, lunch, and dinner
        if (['breakfast', 'lunch', 'dinner'].includes(mealType)) {
            // Add vertical line for meal time
            svg.append('line')
                .attr('x1', x(meal.Timestamp))
                .attr('x2', x(meal.Timestamp))
                .attr('y1', 20)  // Start 20px from top
                .attr('y2', height)
                .attr('stroke', '#dc3545')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4')
                .style('opacity', 0.7);

            // Add meal label
            svg.append('text')
                .attr('x', x(meal.Timestamp))
                .attr('y', 15)  // Position text just above the line
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', '#dc3545')
                .text(mealType.charAt(0).toUpperCase() + mealType.slice(1));
        }
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

    // Add takeaway container
    const takeawayContainer = container.append('div')
        .style('margin-left', '20px')
        .style('width', '300px')
        .style('font-size', '14px')
        .style('line-height', '1.5')
        .style('padding', '20px')
        .style('background-color', '#f8f9fa')
        .style('border-radius', '5px')
        .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

    // Add takeaway text
    takeawayContainer.append('div')
        .style('font-weight', 'bold')
        .style('margin-bottom', '10px')
        .text('Health Implications:');

    takeawayContainer.append('div')
        .text('You should strive to meet the aforementioned NIH recommendations to be able to live healthily and avoid insulin resistance. Insulin resistance is the preliminary indicator for type 2 diabetes. In the long term, repeated spikes in your blood sugar can cause heart problems, kidney problems, problems with eyesight, and nerve issues like neuropathy, where you lose feeling in fingers and toes.');
}

// Helper function to get baseline values
function getBaseline(nutrient) {
    const baselines = {
        'Carbs': 91,
        'Protein': 37.5,
        'Fat': 20.3,
        'Fiber': 10
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