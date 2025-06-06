// Global variables
let selectedCharacter = null;
let selectedMeal = null;
let mealData = null;

// Comparison section functionality
let comparisonData = {
    character1: null,
    character2: null,
    meal1: null,
    meal2: null,
    data1: null,
    data2: null
};

// Typing animation function
function typeText(element, text, speed = 30) {
    return new Promise((resolve) => {
        let i = 0;
        element.textContent = '';
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                // Add a delay after finishing typing
                setTimeout(resolve, 1000); // 1 second delay after each line
            }
        }
        
        type();
    });
}

// Initialize typing animation
document.addEventListener('DOMContentLoaded', async () => {
    const typingElements = document.querySelectorAll('.typing-text');
    
    for (const element of typingElements) {
        const text = element.getAttribute('data-text');
        await typeText(element, text);
    }
});

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
        
        // Create meal gallery
        createMealGallery();
        
        // Show meal section
        document.getElementById('meal-section').classList.remove('hidden');
        const scrollChar = document.getElementById('scroll-indicator-character');
        scrollChar.classList.remove('hidden');

    });
});

// Create horizontal scrollable meal gallery
function createMealGallery() {
    const uniqueMeals = [...new Set(mealData.map(d => d.Meal))].filter(Boolean);
    const galleryContainer = document.getElementById('meal-gallery');
    galleryContainer.innerHTML = ''; // Clear existing content
    
    uniqueMeals.forEach(meal => {
        const mealCard = document.createElement('div');
        mealCard.className = 'meal-card';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = 120;  // Match the CSS width
        canvas.height = 140; // Height for image + name
        const ctx = canvas.getContext('2d');
        
        // Create image element for loading
        const img = new Image();
        const imageName = meal.toLowerCase().replace(/\s+/g, '_') + '.png';
        
        img.src = `images/${imageName}`;
        
        // When image loads, draw it on canvas
        img.onload = () => {
            // Draw white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw image
            ctx.drawImage(img, 0, 0, canvas.width, 100);
            
            // Draw separator line
            ctx.beginPath();
            ctx.moveTo(0, 100);
            ctx.lineTo(canvas.width, 100);
            ctx.strokeStyle = '#eee';
            ctx.stroke();
            
            // Draw meal name
            ctx.fillStyle = '#333';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // remove all non-alphanumeric characters and replace underscores with spaces and capitalize the first letter
            cleanedmeal = meal.replace(/[^\w\s]/g, '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            
            // Handle text overflow
            const maxWidth = canvas.width - 16; // 8px padding on each side
            let text = cleanedmeal;
            if (ctx.measureText(text).width > maxWidth) {
                while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
                    text = text.slice(0, -1);
                }
                text += '...';
            }
            
            ctx.fillText(text, canvas.width / 2, 120);
        };
        
        // Add click event to select meal
        mealCard.addEventListener('click', () => {
            document.querySelectorAll('.meal-card').forEach(card => card.classList.remove('selected'));
            mealCard.classList.add('selected');
            selectedMeal = meal;
        });
        
        mealCard.appendChild(canvas);
        galleryContainer.appendChild(mealCard);
    });
}

// Meal selection and visualization
document.getElementById('add-to-cart').addEventListener('click', () => {
    if (selectedMeal) {
        const mealInfo = mealData.find(d => d.Meal === selectedMeal);
        createNutritionChart(mealInfo);
        document.getElementById('nutrition-chart').classList.remove('hidden');
        document.getElementById('glucose-button').classList.remove('hidden');
        const scrollNutrition = document.getElementById('scroll-indicator-nutrition');
        scrollNutrition.classList.remove('hidden');

        // Uncomment if we want it to disappear after 5 seconds
        // setTimeout(() => {
        //     scrollNutrition.classList.add('hidden');
        // }, 5000);
    }
    
});

// Create nutrition bar chart
function createNutritionChart(mealInfo, containerId = 'nutrition-bars') {
    const nutrients = ['Carbs', 'Protein', 'Fat', 'Fiber'];
    const values = [
        +mealInfo.Carbs || 0,
        +mealInfo.Protein || 0,
        +mealInfo.Fat || 0,
        +mealInfo.Fiber || 0
    ];

    // Adjust dimensions based on container
    const isComparison = containerId.includes('1') || containerId.includes('2');
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = isComparison ? 350 - margin.left - margin.right : 700 - margin.left - margin.right;
    const height = isComparison ? 300 - margin.top - margin.bottom : 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(`#${containerId}`).html('');

    const svg = d3.select(`#${containerId}`)
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
        });

    // Add baseline lines
    svg.selectAll('.baseline')
        .data(nutrients)
        .enter()
        .append('line')
        .attr('class', 'baseline')
        .attr('x1', d => x(d))
        .attr('x2', d => x(d) + x.bandwidth())
        .attr('y1', d => y(getBaseline(d)))
        .attr('y2', d => y(getBaseline(d)))
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,3');

    // Add hover interaction
    svg.selectAll('rect')
        .on('mouseover', function(event, d) {
            // Fade all other bars
            svg.selectAll('rect')
                .transition()
                .duration(200)
                .style('opacity', function(currentD) {
                    return currentD === d ? 1 : 0.3;
                });

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
            // Restore opacity of all bars
            svg.selectAll('rect')
                .transition()
                .duration(200)
                .style('opacity', 1);
            
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
        { color: '#6f42c1', text: 'Below Baseline' },
        { type: 'line', color: 'black', text: 'Baseline', dasharray: '3,3' }
    ];

    legendItems.forEach((item, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);

        if (item.type === 'line') {
            legendRow.append('line')
                .attr('x1', 0)
                .attr('x2', 15)
                .attr('y1', 7.5)
                .attr('y2', 7.5)
                .attr('stroke', item.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', item.dasharray);
        } else {
            legendRow.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', item.color);
        }

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

    // Add title with different formatting for comparison
    if (isComparison) {
        const character = containerId.includes('1') ? comparisonData.character1 : comparisonData.character2;
        const characterName = character === 'jack' ? "Jack's" : "Jill's";
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text(`${characterName} ${mealInfo.Meal.replace(/[^\w\s]/g, '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}`);
    } else {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text(`Nutritional Content for ${selectedMeal}`);
    }

    // Only add takeaway summary for main view
    if (!isComparison) {
        // Generate and display takeaway summary
        const takeawayContainer = d3.select(`#${containerId}`)
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
}

// Create glucose line chart
function createGlucoseChart(mealInfo, containerId = 'glucose-line', data = mealData) {
    // Adjust dimensions based on container
    const isComparison = containerId.includes('1') || containerId.includes('2');
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = isComparison ? 350 - margin.left - margin.right : 760 - margin.left - margin.right;
    const height = isComparison ? 300 - margin.top - margin.bottom : 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(`#${containerId}`).html('');

    // Create container for chart and takeaway
    const container = d3.select(`#${containerId}`)
        .style('display', 'flex')
        .style('align-items', 'flex-start');

    // Create SVG container
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse timestamps first
    data.forEach(d => {
        d.Timestamp = new Date(d.Timestamp);
        d['Dexcom GL'] = +d['Dexcom GL'] || 0;
    });

    // Filter data for the selected day
    const selectedDate = new Date(mealInfo.Timestamp);
    let dayData = data.filter(d => 
        d.Timestamp.getDate() === selectedDate.getDate() &&
        d.Timestamp.getMonth() === selectedDate.getMonth() &&
        d.Timestamp.getFullYear() === selectedDate.getFullYear()
    );

    // For comparison charts, filter to show only 5pm-midnight
    if (isComparison) {
        const startTime = new Date(selectedDate);
        startTime.setHours(17, 0, 0, 0); // 5 PM
        const endTime = new Date(selectedDate);
        endTime.setHours(23, 59, 59, 999); // Midnight
        
        dayData = dayData.filter(d => 
            d.Timestamp >= startTime && d.Timestamp <= endTime
        );
    }

    const x = d3.scaleTime()
        .domain(d3.extent(dayData, d => d.Timestamp))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(dayData, d => d['Dexcom GL']) * 1.2])
        .range([height, 0]);

    // Add shaded region for ideal glucose range
    svg.append('rect')
        .attr('x', 0)
        .attr('y', y(140))  // Top of the ideal range
        .attr('width', width)
        .attr('height', y(70) - y(140))  // Height between 70 and 140
        .attr('fill', '#90EE90')  // Light green color
        .attr('opacity', 0.3);  // Make it semi-transparent

    // Add x-axis with different formatting for comparison
    if (isComparison) {
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(d3.timeHour.every(1))
                .tickFormat(d3.timeFormat('%I %p')))
            .selectAll('text')
            .style('text-anchor', 'middle')
            .style('font-size', '12px');
    } else {
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('text-anchor', 'middle')
            .style('font-size', '12px');
    }

    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .style('font-size', '12px');

    // Add line
    const line = d3.line()
        .x(d => x(d.Timestamp))
        .y(d => y(d['Dexcom GL']));

    svg.append('path')
        .datum(dayData)
        .attr('fill', 'none')
        .attr('stroke', '#28a745')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add meal annotations
    const meals = dayData.filter(d => d['Meal Type']);
    meals.forEach(meal => {
        const mealType = meal['Meal Type'].toLowerCase();
        if (['breakfast', 'lunch', 'dinner'].includes(mealType)) {
            svg.append('line')
                .attr('x1', x(meal.Timestamp))
                .attr('x2', x(meal.Timestamp))
                .attr('y1', 20)
                .attr('y2', height)
                .attr('stroke', '#dc3545')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4')
                .style('opacity', 0.7);

            svg.append('text')
                .attr('x', x(meal.Timestamp))
                .attr('y', 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('fill', '#dc3545')
                .text(mealType.charAt(0).toUpperCase() + mealType.slice(1));
        }
    });

    // Add brushing (same as before)
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', function(event) {
            if (!event.selection) return;
            const [x0, x1] = event.selection;
            const selectedData = dayData.filter(d => {
                const xPos = x(d.Timestamp);
                return xPos >= x0 && xPos <= x1;
            });
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
            setTimeout(() => tooltip.remove(), 2000);
        });

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    // Add hover line
    const hoverLine = svg.append('line')
        .attr('class', 'hover-line')
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .style('display', 'none');

    // Tooltip image element
    const tooltipImg = d3.select("#tooltip-img");

    // Hover interaction
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mouseover', function() {
            hoverLine.style('display', null);
            tooltipImg.style('display', 'block');  // Show the image
        })
        .on('mouseout', function() {
            hoverLine.style('display', 'none');
            tooltipImg.style('display', 'none');   // Hide the image
            tooltipImg.style('opacity', 0);
            d3.selectAll('.tooltip').remove();
        })
        .on('mousemove', function(event) {
            const [xPos] = d3.pointer(event);
            const xDate = x.invert(xPos);
        
            const bisect = d3.bisector(d => d.Timestamp).left;
            const i = bisect(dayData, xDate, 1);
            const d0 = dayData[i - 1];
            const d1 = dayData[i];
            const d = xDate - d0.Timestamp > d1.Timestamp - xDate ? d1 : d0;
        
            const exactX = x(d.Timestamp);
            const exactY = y(d['Dexcom GL']);
        
            // Get the position of the SVG in the page
            const svgRect = svg.node().getBoundingClientRect();
        
            // Set image position relative to the full page
            tooltipImg
                .style('opacity', 1)
                .style('left', `${svgRect.left + exactX + 60}px`)
                .style('top', `${svgRect.top + exactY + 30}px`);
        
            // Hover line
            hoverLine
                .attr('x1', exactX)
                .attr('x2', exactX)
                .attr('y1', 0)
                .attr('y2', height);
        
            // Tooltip box - now follows mouse cursor
            d3.selectAll('.tooltip').remove();
            d3.select('body').append('div')
                .attr('class', 'tooltip')
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 10}px`)
                .html(`
                    Time: ${d.Timestamp.toLocaleTimeString()}<br>
                    Glucose: ${d['Dexcom GL'].toFixed(1)} mg/dL
                `);
        });

    // Add title with different formatting for comparison
    if (isComparison) {
        const character = containerId.includes('1') ? comparisonData.character1 : comparisonData.character2;
        const characterName = character === 'jack' ? "Jack's" : "Jill's";
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text(`${characterName} Glucose Levels Around Dinner`);
    } else {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .text(`${selectedCharacter === 'jack' ? "Jack's" : "Jill's"} Glucose Levels Throughout the Day`);
    }

    // Only add warning annotation for main view
    if (!isComparison) {
        svg.append('text')
            .attr('x', width - 20)
            .attr('y', 50)
            .attr('text-anchor', 'end')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#dc3545')
            .text('Avoid Glucose Spikes!');
    }

    // Add x-axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Time');

    // Add y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Glucose Levels (mg/dL)');

    // Only add legend for main view
    if (!isComparison) {
        let glucoseLegend;
        glucoseLegend = svg.append('g')
            .attr('class', 'glucose-legend')
            .attr('transform', `translate(${width - 220}, ${height - 20})`);

        glucoseLegend.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', '#90EE90')
            .attr('opacity', 0.3);

        glucoseLegend.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .text('Ideal Glucose Range (70-140 mg/dL)');
    }

    // Only add takeaway box for main view
    if (!isComparison) {
        const takeawayContainer = container.append('div')
            .style('margin-left', '20px')
            .style('width', '300px')
            .style('font-size', '14px')
            .style('line-height', '1.5')
            .style('padding', '20px')
            .style('background-color', '#f8f9fa')
            .style('border-radius', '5px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');

        takeawayContainer.append('div')
            .style('font-weight', 'bold')
            .style('margin-bottom', '10px')
            .text('Health Implications:');

        takeawayContainer.append('div')
            .text('Rollercoaster drops are fun, but Glu-coaster drops are not. You should strive to meet the aforementioned NIH recommendations to live healthily and avoid glucose spikes — repeated sharp rises in blood sugar levels that can strain your ability to regulate insulin. Over time, this can lead to insulin resistance, a key early indicator of type 2 diabetes. In the long term, frequent glucose spikes may contribute to heart problems, kidney damage, impaired eyesight, and nerve conditions like neuropathy, where sensation is lost in the fingers and toes.');
    }
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
    document.getElementById('comparison-section').classList.add('hidden');
    
    // Reset comparison dropdowns
    document.getElementById('character1').value = '';
    document.getElementById('character2').value = '';
    document.getElementById('meal1').value = '';
    document.getElementById('meal2').value = '';
    
    // Clear comparison charts
    document.getElementById('nutrition-bars-1').innerHTML = '';
    document.getElementById('nutrition-bars-2').innerHTML = '';
    document.getElementById('glucose-line-1').innerHTML = '';
    document.getElementById('glucose-line-2').innerHTML = '';
    
    // Reset comparison data
    comparisonData = {
        character1: null,
        character2: null,
        meal1: null,
        meal2: null,
        data1: null,
        data2: null
    };
    
    // Hide all scroll indicators
    document.getElementById('scroll-indicator-character').classList.add('hidden');
    document.getElementById('scroll-indicator-nutrition').classList.add('hidden');
    document.getElementById('scroll-indicator-glucose').classList.add('hidden');
    selectedCharacter = null;
    selectedMeal = null;
});

// Function to animate conclusion elements
function animateConclusion() {
    const conclusionElements = document.querySelectorAll('#conclusion p, #conclusion h3');
    let delay = 0;
    const delayBetweenElements = 800; // 800ms between each element

    conclusionElements.forEach(element => {
        setTimeout(() => {
            element.classList.add('fade-in');
        }, delay);
        delay += delayBetweenElements;
    });
}

// Add event listener for glucose button
document.getElementById('glucose-button').addEventListener('click', () => {
    const mealInfo = mealData.find(d => d.Meal === selectedMeal);
    createGlucoseChart(mealInfo);
    document.getElementById('glucose-chart').classList.remove('hidden');
    document.getElementById('see-takeaways').classList.remove('hidden');

    const scrollGlucose = document.getElementById('scroll-indicator-glucose');
    scrollGlucose.classList.remove('hidden');

    // Automatically scroll
    document.getElementById('glucose-chart').scrollIntoView({ behavior: 'smooth' });
});

// Add event listener for see takeaways button
document.getElementById('see-takeaways').addEventListener('click', () => {
    document.getElementById('comparison-section').classList.remove('hidden');
    document.getElementById('conclusion').classList.remove('hidden');
    document.getElementById('see-takeaways').classList.add('hidden');
    
    // Scroll to comparison section
    document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('scroll-indicator-comparison').classList.remove('hidden');
});

// Set up scroll-triggered animations for conclusion
const conclusionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            // Once the element is animated, we can stop observing it
            conclusionObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2, // Trigger when 20% of the element is visible
    rootMargin: '0px 0px -50px 0px' // Start animation slightly before the element comes into view
});

// Observe all conclusion elements
document.querySelectorAll('#conclusion p, #conclusion h3').forEach(element => {
    conclusionObserver.observe(element);
});

// Handle character selection in comparison
document.getElementById('character1').addEventListener('change', async function() {
    comparisonData.character1 = this.value;
    if (this.value) {
        comparisonData.data1 = await loadData(this.value);
        updateMealDropdown('meal1', comparisonData.data1);
    }
});

document.getElementById('character2').addEventListener('change', async function() {
    comparisonData.character2 = this.value;
    if (this.value) {
        comparisonData.data2 = await loadData(this.value);
        updateMealDropdown('meal2', comparisonData.data2);
    }
});

// Handle meal selection in comparison
document.getElementById('meal1').addEventListener('change', function() {
    comparisonData.meal1 = this.value;
    if (this.value && comparisonData.data1) {
        const mealInfo = comparisonData.data1.find(d => d.Meal === this.value);
        createNutritionChart(mealInfo, 'nutrition-bars-1');
        createGlucoseChart(mealInfo, 'glucose-line-1', comparisonData.data1);
    }
});

document.getElementById('meal2').addEventListener('change', function() {
    comparisonData.meal2 = this.value;
    if (this.value && comparisonData.data2) {
        const mealInfo = comparisonData.data2.find(d => d.Meal === this.value);
        createNutritionChart(mealInfo, 'nutrition-bars-2');
        createGlucoseChart(mealInfo, 'glucose-line-2', comparisonData.data2);
    }
});

// Update meal dropdown options
function updateMealDropdown(dropdownId, data) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '<option value="">Select Meal</option>';
    
    const uniqueMeals = [...new Set(data.map(d => d.Meal))].filter(Boolean);
    uniqueMeals.forEach(meal => {
        const option = document.createElement('option');
        option.value = meal;
        option.textContent = meal.replace(/[^\w\s]/g, '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        dropdown.appendChild(option);
    });
}

document.getElementById('watch-video-button').addEventListener('click', () => {
    window.open('https://youtu.be/XHZikXvLbKc', '_blank');
  });
  