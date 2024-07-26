console.log("0.05");

function buildMongoQuery(type, location, region, category, subcategory) {

    var request = [];

    if ( type == "Location") {
        request.push({
            "$match": {
                "location":location
            }
        });
    }

    if ( type == "Region") {
        request.push({
            "$match": {
                "region":region
            }
        });
    }

    if ( type != "Category") {
        request.push({
            "$match": {
                "subcategory":subcategory
            }
        });
    }

    request.push({
        "$match": {
            "category":category
        }
    });

    return request
}

function buildMongoSettings(type, location, region, subcategory, category) {

    var settings = {
        "url": "https://eu-west-2.aws.data.mongodb-api.com/app/data-bdwyp/endpoint/data/v1/action/aggregate",
        "method": "POST",
        "timeout": 0,
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+window.kb_a_t
        },
        
        "data": JSON.stringify({
            "collection": type,
            "database": "DealAnalyser",
            "dataSource": "KnowledgeBase",
            "pipeline": 
                buildMongoQuery(type, location, region, subcategory, category)
            
            }),
    };

    return settings
}

function onInitialSubmit(){

    if ( !window.processing ) {

        window.processing = true;

        if (typeof window.kb_a_t == 'undefined'){
            var settings = {
              "url": "https://eu-west-2.aws.services.cloud.mongodb.com/api/client/v2.0/app/data-bdwyp/auth/providers/anon-user/login",
              "method": "POST",
              "timeout": 0,
            };
            
            jQuery.ajax(settings).done(function (response) {
                window.kb_a_t = response["access_token"];
                sendInitialRequest();
            });
        
        } else {
            
            sendInitialRequest();

        }
    }
}

function getData(type, location, region, category, subcategory) {

    var nextType = "";

    if ( type == "Location") {

        nextType = "Region";

    }
    else if ( type == "Region") {

        nextType = "Subcategory";

    }
    else {

        nextType = "Category";

    }

    jQuery.ajax(buildMongoSettings(type,location,region,category,subcategory)).done(function (response) {

        var responseData = response["documents"];

        window.processing = false;

        if ( responseData.length == 0 ) {

            console.log("No results at "+type+" level, trying "+nextType);

            window.processing = true;

            getData(nextType, location, region, category, subcategory);

            return

        }

        var result = responseData[0];

        if ( result["trainingDeals"] < 10 ) {

            console.log("Not enough data at "+type+" level, trying "+nextType);

            getData(nextType, location, region, category, subcategory);

            return

        }

        calculateResults(result, type);

    });
}

function sendInitialRequest() {

    var type = "Location";
    var cat = document.getElementById("category").value;
    var subcat = document.getElementById("subcategory").value;
    var locArray = document.getElementById("location").value.split("|");
    var loc = locArray[0];
    var region = locArray[1];

    getData(type,loc,region,cat,subcat);
}

function updateSubcategories() {
    const categories = {
        'Beauty': ['Spa', 'Massage', 'Dermal Fillers/Injectables', 'Other', 'Hair Cuts & Treatments', 'Hair Removal', 'Pamper Packages', 'Facials', 'Slimming', 'Teeth Whitening', 'Bodycare', 'Makeup', 'Semi-permanent Makeup', 'Dental Braces', 'Dental Veneers', 'Skincare', 'Eyes', 'Nails'],
        'Restaurants & Bars': ['Afternoon Tea', 'British', 'Gourmet', 'Italian', 'Other', 'Cocktails', 'Asian', 'World Food', 'Grill/BBQ', 'Steaks', 'Sushi', 'South American', 'Curry', 'Tasting', 'Cabaret', 'French'],
        'Activities': ['Motoring', 'Adventure & Theme Parks & Zoos', 'Outdoor/Action', 'Other', 'Animals', 'Flying', 'Photoshoot', 'Sport (Participating)', 'Kids Activities.', 'Escape Games', 'Makeup Masterclass', 'Watersports', 'Trampolining', 'Archery/Shooting', 'Murder Mystery/Zombie Run', 'Paintballing'],
        'Spas & Country House': ['Country House Hotels', 'Spa Breaks', 'Scotland', 'Other', 'Glamping and Camping', 'Lake District', 'Attractions', 'Pubs & Inns', 'Yorkshire', 'Cottages'],
        'UK City Breaks': ['London', 'Other UK Cities', 'Edinburgh', 'Manchester', 'Liverpool', 'Glasgow', 'Birmingham'],
        'Entertainment': ['Theatre/Circus/Shows', 'Bingo & Gambling', 'Daytrips', 'Cinema', 'Fairs & Shows', 'Bus Tours', 'Exhibitions & Gardens', 'River Cruises', 'Sport (Spectating)', 'Festivals', 'Other', 'Concerts/Nightlife', 'Psychic', 'Strippers', 'Comedy'],
        'Healthcare': ['Food Intolerance', 'Dental Care', 'Health MOT', 'Hair Transplants', 'Other'],
        'Electronics': ['Software'],
        'Food and Drink': ['Beer', 'Food Hampers', 'Diet Food', 'Chocolates & Confectionery', 'Coffee & Tea', 'Wine'],
        'Learning': ['Beauty', 'Teaching', 'Driving Lessons', 'Health', 'Business', 'Self-help', 'Languages', 'Cooking/Baking'],
        'Tradesmen': ['Car Breakdown Cover'],
        'UK Seaside': ['Other Seaside', 'Blackpool'],
        'Ireland': ['Country Breaks'],
        'Legal Services': ['Will Writing'],
        'Fitness': ['Other', 'Gym Passes'],
        'Wedding': ['Photography'],
        'Home': ['Cleaning & Home Maintenance'],
        'Other': ['Wowcher Gift Card']
    };

    const categorySelect = document.getElementById("category");
    const subcategorySelect = document.getElementById("subcategory");
    const selectedCategory = categorySelect.options[categorySelect.selectedIndex].value;

    // Clear existing subcategory options
    subcategorySelect.innerHTML = "";

    // Add new subcategory options
    if (selectedCategory in categories) {
        categories[selectedCategory].forEach(function(subcategory) {
            const option = document.createElement("option");
            option.value = subcategory;
            option.text = subcategory;
            subcategorySelect.add(option);
        });
    }
}

function scoreVsAverage(value, lowerQuartile, median, upperQuartile, scoreCoeff, varName) {

    if ( value > upperQuartile ) {

        if ( scoreCoeff > 0 ) {

            return [Math.abs(scoreCoeff*3), varName+" above Upper Quartile Value, maximum score achieved.",0]
        }
        else {

            return [0, varName+" above Upper Quartile Value, minimum score achieved. Reach a value below "+upperQuartile+" to remove this penalty",Math.abs(scoreCoeff*3)]
        }
            
    }
    else if ( value < lowerQuartile ) {

        if ( scoreCoeff > 0 ) {

            return [0, varName+" below Lower Quartile Value, minimum score achieved. Reach a value above "+lowerQuartile+" to remove this penalty",Math.abs(scoreCoeff*3)]
        }
        else {

            return [Math.abs(scoreCoeff)*3, varName+" below Lower Quartile Value, maximum score achieved.",0]
        }

    }
    else {

        if ( scoreCoeff > 0 ) {

            return [Math.abs(scoreCoeff)*2, varName+" between Lower Quartile Value and Upper Quartile Value, average score achieved. Reach a value above "+upperQuartile+" to maximise score.",Math.abs(scoreCoeff)]
        }
        else {

            return [Math.abs(scoreCoeff)*2, varName+" between Lower Quartile Value and Upper Quartile Value, average score achieved. Reach a value below "+lowerQuartile+" to maximise score.",Math.abs(scoreCoeff)]
        }

    }


}

function calculateResults(result, type) {

    console.log(result);
    var allMessaging = [];

    var totalScore = 0;
    var maxScore = 0;

    var calcConstant = result["coeff_const"];

    var price = document.getElementById("price").value;
    var priceScoring = -2;

    var coeffPrice = result["coeff_price"];
    var meanPrice = result["mean_price"];
    var medianPrice = result["median_price"];
    var upperPrice = result["upperQuartile_price"];
    var lowerPrice = result["lowerQuartile_price"];
    var calcPrice = price * coeffPrice;
    var meanCalcPrice = meanPrice * coeffPrice;
    var medianCalcPrice = medianPrice * coeffPrice;
    var priceDelta = meanCalcPrice - calcPrice;
    var medianPriceDelta = medianCalcPrice - calcPrice;

    var [priceScoringVsAverage, priceMessaging, priceDefecit] = scoreVsAverage(price, lowerPrice, medianPrice, upperPrice, priceScoring, "Price");
    var priceMaxAttainable = priceScoringVsAverage + priceDefecit;
    allMessaging.push([priceScoringVsAverage, priceMessaging, priceDefecit]);

    totalScore = totalScore + priceScoringVsAverage;
    maxScore = maxScore + priceMaxAttainable;


    var discountPercent = document.getElementById("discount_pc").value;
    var discountPercentScoring = 1;

    var coeffDiscountPercent = result["coeff_discount_pc"];
    var meanDiscountPercent = result["mean_discount_pc"];
    var medianDiscountPercent = result["median_discount_pc"];
    var upperDiscountPercent = result["upperQuartile_discount_pc"];
    var lowerDiscountPercent = result["lowerQuartile_discount_pc"];
    var calcDiscountPercent = discountPercent * coeffDiscountPercent;
    var meanCalcDiscountPercent = meanDiscountPercent * coeffDiscountPercent;
    var medianCalcDiscountPercent = medianDiscountPercent * coeffDiscountPercent;
    var discountPercentDelta = meanCalcDiscountPercent - calcDiscountPercent;
    var medianDiscountPercentDelta = medianCalcDiscountPercent - calcDiscountPercent;

    var [discountPercentScoringVsAverage, discountPercentMessaging, discountPercentDefecit] = scoreVsAverage(discountPercent, lowerDiscountPercent, medianDiscountPercent, upperDiscountPercent, discountPercentScoring, "Discount Percent");
    var discountPercentMaxAttainable = discountPercentScoringVsAverage + discountPercentDefecit;
    allMessaging.push([discountPercentScoringVsAverage, discountPercentMessaging, discountPercentDefecit]);
 
    totalScore = totalScore + discountPercentScoringVsAverage;
    maxScore = maxScore + discountPercentMaxAttainable;

    
    var wowcherFee = document.getElementById("wowcher_fee").value;
    var wowcherFeeScoring = 2;

    var coeffWowcherFee = result["coeff_wowcher_fee"];
    var meanWowcherFee = result["mean_wowcher_fee"];
    var medianWowcherFee = result["median_wowcher_fee"];
    var upperWowcherFee = result["upperQuartile_wowcher_fee"];
    var lowerWowcherFee = result["lowerQuartile_wowcher_fee"];
    var calcWowcherFee = wowcherFee * coeffWowcherFee;
    var meanCalcWowcherFee = meanWowcherFee * coeffWowcherFee;
    var medianCalcWowcherFee = medianWowcherFee * coeffWowcherFee;
    var wowcherFeeDelta = meanCalcWowcherFee - calcWowcherFee;
    var medianWowcherFeeDelta = medianCalcWowcherFee - calcWowcherFee;

    var [wowcherFeeScoringVsAverage, wowcherFeeMessaging, wowcherFeeDefecit] = scoreVsAverage(wowcherFee, lowerWowcherFee, medianWowcherFee, upperWowcherFee, wowcherFeeScoring, "Wowcher Fee");
    var wowcherFeeMaxAttainable = wowcherFeeScoringVsAverage + wowcherFeeDefecit;
    allMessaging.push([wowcherFeeScoringVsAverage, wowcherFeeMessaging, wowcherFeeDefecit]);

    totalScore = totalScore + wowcherFeeScoringVsAverage;
    maxScore = maxScore + wowcherFeeMaxAttainable;

    
    var minDistance = document.getElementById("centre_distance").value;
    var minDistanceScoring = -1;

    var coeffMinDistance = result["coeff_min_distance_to_centre"];
    var meanMinDistance = result["mean_min_distance_to_centre"];
    var medianMinDistance = result["median_min_distance_to_centre"];
    var upperMinDistance = result["upperQuartile_min_distance_to_centre"];
    var lowerMinDistance = result["lowerQuartile_min_distance_to_centre"];
    var calcMinDistance = minDistance * coeffMinDistance;
    var meanCalcMinDistance = meanMinDistance * coeffMinDistance;
    var medianCalcMinDistance = medianMinDistance * coeffMinDistance;
    var minDistanceDelta = meanCalcMinDistance - calcMinDistance;
    var medianMinDistanceDelta = medianCalcMinDistance - calcMinDistance;

    var [minDistanceScoringVsAverage, minDistanceMessaging, minDistanceDefecit] = scoreVsAverage(minDistance, lowerMinDistance, medianMinDistance, upperMinDistance, minDistanceScoring, "Minimum Distance to City Centre");
    var minDistanceMaxAttainable = minDistanceScoringVsAverage + minDistanceDefecit;
    allMessaging.push([minDistanceScoringVsAverage, minDistanceMessaging, minDistanceDefecit]);

    totalScore = totalScore + minDistanceScoringVsAverage;
    maxScore = maxScore + minDistanceMaxAttainable;

    
    var uniqueCities = document.getElementById("unique_cities").value;
    var uniqueCitiesScoring = 1;

    var coeffUniqueCities = result["coeff_unique_cities"];
    var meanUniqueCities = result["mean_unique_cities"];
    var medianUniqueCities = result["median_unique_cities"];
    var upperUniqueCities = result["upperQuartile_unique_cities"];
    var lowerUniqueCities = result["lowerQuartile_unique_cities"];
    var calcUniqueCities = uniqueCities * coeffUniqueCities;
    var meanCalcUniqueCities = meanUniqueCities * coeffUniqueCities;
    var medianCalcUniqueCities = medianUniqueCities * coeffUniqueCities;
    var uniqueCitiesDelta = meanCalcUniqueCities - calcUniqueCities;
    var medianUniqueCitiesDelta = medianCalcUniqueCities - calcUniqueCities;

    var [uniqueCitiesScoringVsAverage, uniqueCitiesMessaging, uniqueCitiesDefecit] = scoreVsAverage(uniqueCities, lowerUniqueCities, medianUniqueCities, upperUniqueCities, uniqueCitiesScoring, "Unique Cities with Location");
    var uniqueCitiesMaxAttainable = uniqueCitiesScoringVsAverage + uniqueCitiesDefecit;
    allMessaging.push([uniqueCitiesScoringVsAverage, uniqueCitiesMessaging, uniqueCitiesDefecit]);

    totalScore = totalScore + uniqueCitiesScoringVsAverage;
    maxScore = maxScore + uniqueCitiesMaxAttainable;


    var totalLocs = document.getElementById("total_locs").value;
    var totalLocsScoring = 1;

    var coeffTotalLocs = result["coeff_total_locs"];
    var meanTotalLocs = result["mean_total_locs"];
    var medianTotalLocs = result["median_total_locs"];
    var upperTotalLocs = result["upperQuartile_total_locs"];
    var lowerTotalLocs = result["lowerQuartile_total_locs"];
    var calcTotalLocs = totalLocs * coeffTotalLocs;
    var meanCalcTotalLocs = meanTotalLocs * coeffTotalLocs;
    var medianCalcTotalLocs = medianTotalLocs * coeffTotalLocs;
    var totalLocsDelta = meanCalcTotalLocs - calcTotalLocs;
    var medianTotalLocsDelta = medianCalcTotalLocs - calcTotalLocs;

    var [totalLocsScoringVsAverage, totalLocsMessaging, totalLocsDefecit] = scoreVsAverage(totalLocs, lowerTotalLocs, medianTotalLocs, upperTotalLocs, totalLocsScoring, "Total Locations");
    var totalLocsMaxAttainable = totalLocsScoringVsAverage + totalLocsDefecit;
    allMessaging.push([totalLocsScoringVsAverage, totalLocsMessaging, totalLocsDefecit]);

    totalScore = totalScore + totalLocsScoringVsAverage;
    maxScore = maxScore + totalLocsMaxAttainable;

    var finalRevPrediction = calcConstant + calcPrice + calcDiscountPercent + calcWowcherFee + calcMinDistance + calcUniqueCities + calcTotalLocs;
    var finalMeanRevPrediction = calcConstant + meanCalcPrice + meanCalcDiscountPercent + meanCalcWowcherFee + meanCalcMinDistance + meanCalcUniqueCities + meanCalcTotalLocs;
    //var finalMedianRevPrediction = calcConstant + medianCalcPrice + medianCalcDiscountPercent + medianCalcWowcherFee + medianCalcMinDistance + medianCalcUniqueCities + medianCalcTotalLocs;

    var finalMedianRevPrediction = calcConstant + medianCalcPrice + medianCalcDiscountPercent + medianCalcWowcherFee + medianCalcMinDistance;

    var meanRev = result["mean_thirty_day_net"];
    var medianRev = result["median_thirty_day_net"];


    
    console.log("Used method: "+type);

    renderResults(allMessaging, totalScore, maxScore);

}

function toPastel(rgb) {
    const pastelFactor = 0.7; // This controls the pastel intensity
    const white = 255;
    return rgb.map(channel => Math.round(channel + (white - channel) * pastelFactor));
}

// Function to interpolate between two colors
function interpolateColor(startColor, endColor, factor) {
    return startColor.map((start, i) => start + factor * (endColor[i] - start));
}

// Function to convert RGB to Hex
function rgbToHex(rgb) {
    return rgb.map(channel => {
        const hex = channel.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Function to get a pastel color from red to green based on a value from 0 to 5
function getPastelColor(value, maxVal) {
    const red = [255, 0, 0];
    const green = [0, 255, 0];
    const clampedValue = Math.max(0, Math.min(maxVal, value)); // Ensure value is within range
    const factor = clampedValue / maxVal; // Normalize value to range 0-1
    const interpolatedColor = interpolateColor(green, red, factor);
    const pastelColor = toPastel(interpolatedColor);
    const hexColor = rgbToHex(pastelColor);
    return `#${hexColor}`;
}

function renderResults(allMessaging, totalScore, maxScore) {

    jQuery("#messaging").empty();
    jQuery("#finalScore").empty();


    var sortedArray = allMessaging.sort((a, b) => b[2] - a[2]);

    for (i=0; i<sortedArray.length; i++) {

        jQuery("#messaging").append('<div style="background-color:'+getPastelColor(sortedArray[i][2],6)+';width:100%;">'+sortedArray[i][1]+'</div>');

    }

    jQuery("#finalScore").append('<div>'+totalScore+'/'+maxScore+'</div>')


}