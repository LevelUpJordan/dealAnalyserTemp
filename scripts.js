console.log("0.41");

function buildMongoQuery(type, location, region, category, subcategory, concept) {

    var request = [];

    if ( type.indexOf("Location") > -1 ) {
        request.push({
            "$match": {
                "location":location
            }
        });
    }

    if ( type.indexOf("Region") > -1 ) {
        request.push({
            "$match": {
                "region":region
            }
        });
    }

    if ( type.indexOf("Category") == -1 && type.indexOf("Concept") == -1 ) {
        request.push({
            "$match": {
                "subcategory":subcategory
            }
        });
    }

    if ( type.indexOf("Concept") == -1 ) {
      request.push({
          "$match": {
              "category":category
          }
      });
    }

    if ( type.indexOf("Concept") > -1 ) {
      request.push({
          "$match": {
              "concept":concept
          }
      });
    }

    return request
}

function buildMongoSettings(type, location, region, subcategory, category, concept) {

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
                buildMongoQuery(type, location, region, subcategory, category, concept)
            
            }),
    };

    return settings
}

function onInitialSubmit(){

    if ( !window.processing ) {
    
       jQuery("#technicalMessaging").empty();
       jQuery("#messaging").empty();
       jQuery("#finalScore").empty();
       jQuery("#predictedRev").empty();
       jQuery("#exampleDeals").empty();

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

function getData(type, location, region, category, subcategory, concept) {

    var nextType = "";

    if ( type == "Location") {

        nextType = "Region";

    }
    else if ( type == "Region") {

        nextType = "Subcategory";

    }
    else if ( type == "Subcategory") {

        nextType = "Category";

    }
    else if ( type == "ConceptLocation") {

        nextType = "ConceptRegion";

    }
    else if ( type == "ConceptRegion") {

        nextType = "Concept";

    }
    else {

      nextType = "None";

    }


    jQuery.ajax(buildMongoSettings(type,location,region,category,subcategory,concept)).done(function (response) {

        var responseData = response["documents"];

        window.processing = false;

        if ( responseData.length == 0 ) {

            if ( nextType != "None" ) {

                jQuery("#technicalMessaging").append("<div>No results at "+type+" level, trying "+nextType+"</div>");

                window.processing = true;

                getData(nextType, location, region, category, subcategory, concept);

                return
            }

            else {

                jQuery("#technicalMessaging").append("<div>No Results</div>");

                return

            }

        }

        var result = responseData[0];

        if ( result["totalDeals"] < 10  ) {

            if ( nextType != "None" ) {

                jQuery("#technicalMessaging").append("<div>Not enough data at "+type+" level, trying "+nextType+"</div>");

                getData(nextType, location, region, category, subcategory, concept);

                return

            }

            else {

                jQuery("#technicalMessaging").append("<div>Not Enough Data</div>");

                return

            }

        }

        calculateResults(result, type);

    });
}

function sendInitialRequest() {

    var matchType = document.getElementById("match_type").value;
    var concept = document.getElementById("concept").value;
    if ( matchType == "Concept") {
      var type = "ConceptLocation";
    }
    else {
      var type = "Location";
    }
    
    var cat = document.getElementById("category").value;
    var subcat = document.getElementById("subcategory").value;
    var locArray = document.getElementById("location").value.split("|");
    var loc = locArray[0];
    var region = locArray[1];


    getData(type,loc,region,cat,subcat,concept,matchType);
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

    const concepts = {
        'Beauty': [
                    "Hammam Spa Experience for 1",
                    "Hammam Spa Experience for 2",
                    "Spa day treatments and lunch for 1",
                    "Spa day treatments and lunch for 2",
                    "Spa day with lunch for 1",
                    "Spa day with lunch for 2",
                    "Spa day treatments & lunch for 1",
                    "Spa day treatments & lunch for 2",
                    "Spa day with Afternoon tea for 1",
                    "Spa day with Afternoon tea for 2",
                    "Spa day with Afternoon tea & bubbly for 1",
                    "Spa day with Afternoon tea & bubbly for 2",
                    "Spa day 3 treatments and voucher for 1",
                    "Spa day 3 treatments and voucher for 2",
                    "Spa Day - 3 Treatments & Prosecco for 1",
                    "Spa Day - 3 Treatments & Prosecco for 2",
                    "Spa Day - 3 Treatments & Prosecco & voucher for 1",
                    "Spa Day - 3 Treatments & Prosecco & voucher for 2",
                    "1 hour Choice of Massage",
                    "6 Sessions Laser Hair Removal",
                    "Teeth Whitening",
                    "0.5ml Lip Filler",
                    "Dental Composite Bonding for 4 teeth",
                    "Colonic Hydrotherapy",
                    "60 min Hydrafacial",
                    "Full Body Aromatherapy Massage for 1",
                    "Spa day 2 treatments and voucher for 1",
                    "Spa day 2 treatments and voucher for 2",
                    "Spa Day - 2 Treatments & Prosecco for 1",
                    "Spa Day - 2 Treatments & Prosecco for 2",
                    "Spa Day - 2 Treatments & Prosecco & voucher for 1",
                    "Spa Day - 2 Treatments & Prosecco & voucher for 2"
                ],
        'Activities': [
                    "Christmas theatre ticket for 1",
                    "Festival entry for 1",
                    "Zoo Entry for 1",
                    "Zoo Family ticket",
                    "Theme park entry for 2",
                    "Theme park entry for 4",
                    "Theme park entry for 1",
                    "Theme Park season pass for 1",
                    "24 hour hop on hop off bus tour",
                    "48 hour hop on hof off bus tour",
                    "Bus Tour with Afternoon Tea",
                    "BYOB Pottery Workshop",
                    "Pottery workshop",
                    "1 hour aquapark session for 1",
                    "90 min aquapark session for 1",
                    "Supercar Driving Experience",
                    "Junior sportscar driving experience",
                    "Scuba diving lesson for 1",
                    "Lorry Driving experience for 1",
                    "Segway experience for 1",
                    "60 min Puppy Yoga for 1",
                    "Circus entry for 1",
                    "Day coach trip for 1",
                    "Skiing or snowboarding day course for 1",
                    "Softplay entry meal and drink for 1",
                    "Softplay entry meal and drink for 2",
                    "Softplay entry meal and drink for 4",
                    "one hour Climbing session for 1",
                    "one hour Climbing session for 2",
                    "one hour Climbing session for 4",
                    "2 hour Animal experience for 2",
                    "Paintballing for 5",
                    "Paintballing for 10",
                    "Canal boat hire for 10",
                    "Canal boat hire for 6",
                    "Alpaca walk + tea for 1",
                    "Alpaca walk + tea for 2",
                    "90 min Alpaca walking experience for 1",
                    "90 min Alpaca walking experience for 2",
                    "Alpaca feeding experience",
                    "Petting zoo entry for 1",
                    "Adventure Park entry for 1",
                    "Inflatable park day with lunch for 1",
                    "Museum Entry for 1",
                    "Exhibition/gardens entry for 1",
                    "Exhibition/gardens entry for 2",
                    "Flight simulator experience for 1",
                    "Aircraft Flying lesson for 60 mins",
                    "Aircraft Flying lesson for 90 mins",
                    "Family farm ticket for 4",
                    "Brewery tour for 1 with beers",
                    "Christmas immersive experience for 1",
                    "Christmas light show for 1",
                    "Pumpkin picking for 1",
                    "Drag show for 1",
                    "Cabaret show with cocktails for 1",
                    "Go karting for 1",
                    "Steam train driver experience",
                    "Quad biking experience for 1",
                    "Quad biking experience for 2",
                    "Junior zookeeper experience",
                    "Family photoshoot, 3 prints and a voucher",
                    "Boudoir photoshoot, 3 prints and a voucher",
                    "Couples photoshoot 3 prints and a voucher",
                    "Name a star personalised gift",
                    "Archery experience for 2 for 1 hour",
                    "Psychic tarot card reading",
                    "1 hour axe throwing experience",
                    "Adopt an animal package with certificate and a photo",
                    "Goat walking experience",
                    "Meerkat experience for 1 with cream tea",
                    "Meerkat experience for 2 with cream tea",
                    "Meerkat experience with zoo entry for 1",
                    "Meerkat experience with zoo entry for 2",
                    "Immersive VR experience for 1",
                    "Immersive VR experience for 2",
                    "Immersive VR experience for 4",
                    "30 min Golf lessons",
                    "Crazy golf for 1",
                    "Crazy golf for 2",
                    "Crazy golf for 4",
                    "Crazy golf with a drink for 1",
                    "Crazy golf with a drink for 2",
                    "Crazy golf with a drink for 4",
                    "90 min iceskating session for 1",
                    "60 min iceskating session for 1",
                    "1 hour jump session trampoline park for 1",
                    "2 hour jump session trampoline park for 1",
                    "River cruise for 1",
                    "2 hour Cooking/Baking class for 1",
                    "2 hour Cooking/Baking class for 2",
                    "Chocolate making workshop for 2",
                    "Sushi Making for 1",
                    "Sushi Making for 2",
                    "Tribute Act show entry for 1",
                    "Theatre show ticket for 1",
                    "Gin school for 1",
                    "Beer school for 1"
                ],
        'Restaurants & Bars': [
                                "12 dish tasting menu and champagne",
                                "2 course dining for 2",
                                "2 course dining for 2 with a glass of wine",
                                "2 course Teppanyaki dining for 2",
                                "3 course dining for 2 with a bottle of wine",
                                "3 course dining for 2 with a glass of wine",
                                "Afternoon Tea for 2",
                                "Afternoon Tea for 2 with Prosecco/champagne",
                                "Alpaca walk and afternoon tea for 2",
                                "Bottomless Afternoon tea for 1",
                                "Bottomless brunch for 1",
                                "Bottomless brunch for 2",
                                "Brunch for 2",
                                "Burger, fries and drink for 2",
                                "Bus tour with Afternoon tea",
                                "Dinner and a cocktail for 2",
                                "Premium 3 course dining for 2",
                                "Premium afternoon tea for 2",
                                "Sunday Roast with wine",
                                "Superyacht afternoon tea for 2",
                                "Tapas and cocktails or wine for 2",
                                "Unlimited Sushi",
                                "Steak Dining and a glass of Wine",
                                "Chinese Dining with a side and a drink",
                                "5 course Teppanyaki Dining for 2",
                                "Pizza and a flight of beers"
                            ]
    };

    const categorySelect = document.getElementById("category");
    const subcategorySelect = document.getElementById("subcategory");
    const conceptSelect = document.getElementById("concept");
    const selectedCategory = categorySelect.options[categorySelect.selectedIndex].value;

    // Clear existing subcategory options
    subcategorySelect.innerHTML = "";

    // Add new subcategory options
    if (selectedCategory in categories) {

        var sortedSubcats = categories[selectedCategory].sort();
        
        sortedSubcats.forEach(function(subcategory) {
            const option = document.createElement("option");
            option.value = subcategory;
            option.text = subcategory;
            subcategorySelect.add(option);
        });
    }

    // Clear existing concept options
    conceptSelect.innerHTML = "";

    // Add new concept options
    if (selectedCategory in concepts) {

        var sortedConcepts = concepts[selectedCategory].sort();
        
        sortedConcepts.forEach(function(concept) {
            const option = document.createElement("option");
            option.value = concept;
            option.text = concept;
            conceptSelect.add(option);
        });
    }
    else {
       const option = document.createElement("option");
       option.value = "N/A";
       option.text = "N/A";
       conceptSelect.add(option);
    }
}

function updateMatchType() {

  const matchTypeSelect = document.getElementById("match_type");
  const selectedMatchType = matchTypeSelect.options[matchTypeSelect.selectedIndex].value;

  if ( selectedMatchType == "Concept" ) {

    document.querySelector('.subcat_filter').classList.add('hidden');
    document.querySelector('.concept_filter').classList.remove('hidden');

  }
  else {

    document.querySelector('.subcat_filter').classList.remove('hidden');
    document.querySelector('.concept_filter').classList.add('hidden');
  }

}


function calculateResults(result, type) {

    console.log(result);
    var allMessaging = [];

    var totalScore = 0;
    var maxScore = 0;

    var price = document.getElementById("price").value;
    var priceScoring = -4;

    var meanPrice = round(result["mean_price"],0);
    var medianPrice = round(result["median_price_wght"],0);
    var upperPrice = round(result["upperQuartile_price_wght"],0);
    var lowerPrice = round(result["lowerQuartile_price_wght"],0);

    var [priceScoringVsAverage, priceMessaging, priceDefecit, priceNextIncrement, priceTarget] = scoreVsAverage(price, lowerPrice, medianPrice, upperPrice, priceScoring, "Price");
    var priceMaxAttainable = priceScoringVsAverage + priceDefecit;
    allMessaging.push([priceScoringVsAverage, priceMessaging, priceDefecit, priceNextIncrement, "price", priceTarget]);

    totalScore = totalScore + priceScoringVsAverage;
    maxScore = maxScore + priceMaxAttainable;


    var discountPercent = document.getElementById("discount_pc").value;
    var discountPercentScoring = 1;

    var meanDiscountPercent = round(result["mean_discount_pc"],0);
    var medianDiscountPercent = round(result["median_discount_pc_wght"],0);
    var upperDiscountPercent = round(result["upperQuartile_discount_pc_wght"],0);
    var lowerDiscountPercent = round(result["lowerQuartile_discount_pc_wght"],0);

    var [discountPercentScoringVsAverage, discountPercentMessaging, discountPercentDefecit, discountPercentNextIncrement, discountPercentTarget] = scoreVsAverage(discountPercent, lowerDiscountPercent, medianDiscountPercent, upperDiscountPercent, discountPercentScoring, "Discount Percent");
    var discountPercentMaxAttainable = discountPercentScoringVsAverage + discountPercentDefecit;
    allMessaging.push([discountPercentScoringVsAverage, discountPercentMessaging, discountPercentDefecit, discountPercentNextIncrement, "discount_pc", discountPercentTarget]);
 
    totalScore = totalScore + discountPercentScoringVsAverage;
    maxScore = maxScore + discountPercentMaxAttainable;

    
    var wowcherFee = document.getElementById("wowcher_fee").value;
    var wowcherFeeScoring = 2;

    var meanWowcherFee = round(result["mean_wowcher_fee"],0);
    var medianWowcherFee = round(result["median_wowcher_fee_wght"],0);
    var upperWowcherFee = round(result["upperQuartile_wowcher_fee_wght"],0);
    var lowerWowcherFee = round(result["lowerQuartile_wowcher_fee_wght"],0);

    //var [wowcherFeeScoringVsAverage, wowcherFeeMessaging, wowcherFeeDefecit, wowcherFeeNextIncrement] = scoreVsAverage(wowcherFee, lowerWowcherFee, medianWowcherFee, upperWowcherFee, wowcherFeeScoring, "Wowcher Fee");
    //var wowcherFeeMaxAttainable = wowcherFeeScoringVsAverage + wowcherFeeDefecit;
    //allMessaging.push([wowcherFeeScoringVsAverage, wowcherFeeMessaging, wowcherFeeDefecit, wowcherFeeNextIncrement]);

    //totalScore = totalScore + wowcherFeeScoringVsAverage;
    //maxScore = maxScore + wowcherFeeMaxAttainable;

    
    var minDistance = document.getElementById("centre_distance").value;
    var minDistanceScoring = -1;

    var meanMinDistance = round(result["mean_min_distance_to_centre"],0);
    var medianMinDistance = round(result["median_min_distance_to_centre_wght"],0);
    var upperMinDistance = round(result["upperQuartile_min_distance_to_centre_wght"],0);
    var lowerMinDistance = round(result["lowerQuartile_min_distance_to_centre_wght"],0);

    var [minDistanceScoringVsAverage, minDistanceMessaging, minDistanceDefecit, minDistanceNextIncrement, minDistanceTarget] = scoreVsAverage(minDistance, lowerMinDistance, medianMinDistance, upperMinDistance, minDistanceScoring, "Minimum Distance to City Centre");
    var minDistanceMaxAttainable = minDistanceScoringVsAverage + minDistanceDefecit;
    allMessaging.push([minDistanceScoringVsAverage, minDistanceMessaging, minDistanceDefecit, minDistanceNextIncrement, "minDistance", minDistanceTarget]);

    totalScore = totalScore + minDistanceScoringVsAverage;
    maxScore = maxScore + minDistanceMaxAttainable;

    
    var uniqueCities = document.getElementById("unique_cities").value;
    var uniqueCitiesScoring = 1;

    var meanUniqueCities = round(result["mean_unique_cities"],0);
    var medianUniqueCities = round(result["median_unique_cities_wght"],0);
    var upperUniqueCities = round(result["upperQuartile_unique_cities_wght"],0);
    var lowerUniqueCities = round(result["lowerQuartile_unique_cities_wght"],0);

    //var [uniqueCitiesScoringVsAverage, uniqueCitiesMessaging, uniqueCitiesDefecit, uniqueCitiesNextIncrement, uniqueCitiesTarget] = scoreVsAverage(uniqueCities, lowerUniqueCities, medianUniqueCities, upperUniqueCities, uniqueCitiesScoring, "Unique Cities with Location");
    //var uniqueCitiesMaxAttainable = uniqueCitiesScoringVsAverage + uniqueCitiesDefecit;
    //allMessaging.push([uniqueCitiesScoringVsAverage, uniqueCitiesMessaging, uniqueCitiesDefecit, uniqueCitiesNextIncrement, "uniqueCities", uniqueCitiesTarget]);

    //totalScore = totalScore + uniqueCitiesScoringVsAverage;
    //maxScore = maxScore + uniqueCitiesMaxAttainable;


    var totalLocs = document.getElementById("total_locs").value;
    var totalLocsScoring = 1;

    var meanTotalLocs = round(result["mean_total_locs"],0);
    var medianTotalLocs = round(result["median_total_locs_wght"],0);
    var upperTotalLocs = round(result["upperQuartile_total_locs_wght"],0);
    var lowerTotalLocs = round(result["lowerQuartile_total_locs_wght"],0);

    //var [totalLocsScoringVsAverage, totalLocsMessaging, totalLocsDefecit, totalLocsNextIncrement] = scoreVsAverage(totalLocs, lowerTotalLocs, medianTotalLocs, upperTotalLocs, totalLocsScoring, "Total Locations");
    //var totalLocsMaxAttainable = totalLocsScoringVsAverage + totalLocsDefecit;
    //allMessaging.push([totalLocsScoringVsAverage, totalLocsMessaging, totalLocsDefecit, totalLocsNextIncrement]);

    //totalScore = totalScore + totalLocsScoringVsAverage;
    //maxScore = maxScore + totalLocsMaxAttainable;


    var reviewCount = document.getElementById("google_review_count").value;
    var reviewCountScoring = 4;

    var meanReviewCount = 50;
    var medianReviewCount = 50;
    var upperReviewCount = 300;
    var lowerReviewCount = 20;

    var [reviewCountScoringVsAverage, reviewCountMessaging, reviewCountDefecit, reviewCountNextIncrement, reviewCountTarget] = scoreVsAverage(reviewCount, lowerReviewCount, medianReviewCount, upperReviewCount, reviewCountScoring, "Google Review Count");
    var reviewCountMaxAttainable = reviewCountScoringVsAverage + reviewCountDefecit;
    allMessaging.push([reviewCountScoringVsAverage, reviewCountMessaging, reviewCountDefecit, reviewCountNextIncrement, "reviewCount", reviewCountTarget]);

    totalScore = totalScore + reviewCountScoringVsAverage;
    maxScore = maxScore + reviewCountMaxAttainable;

    if ( reviewCount > 0 ) {

        var reviewScore = document.getElementById("google_review_score").value;
        var reviewScoreScoring = 1;

        var meanReviewScore = 3.5;
        var medianReviewScore = 3.6;
        var upperReviewScore = 4.2;
        var lowerReviewScore = 3.0;

        var [reviewScoreScoringVsAverage, reviewScoreMessaging, reviewScoreDefecit, reviewScoreNextIncrement, reviewScoreTarget] = scoreVsAverage(reviewScore, lowerReviewScore, medianReviewScore, upperReviewScore, reviewScoreScoring, "Google Review Score");
        var reviewScoreMaxAttainable = reviewScoreScoringVsAverage + reviewScoreDefecit;
        allMessaging.push([reviewScoreScoringVsAverage, reviewScoreMessaging, reviewScoreDefecit, reviewScoreNextIncrement, "reviewScore", reviewScoreTarget]);

        totalScore = totalScore + reviewScoreScoringVsAverage;
        maxScore = maxScore + reviewScoreMaxAttainable;

    }

    var meanRev = result["mean_thirty_day_net"];
    var medianRev = result["median_thirty_day_net"];
    var maxRev = result["max_thirty_day_net"];
    var minRev = result["min_thirty_day_net"];
    var upperRev = result["upperQuartile_thirty_day_net"];
    var lowerRev = result["lowerQuartile_thirty_day_net"];

    var medianRevPerLoc = result["median_thirty_day_net_per_loc"];
    var maxRevPerLoc = result["max_thirty_day_net_per_loc"];
    var minRevPerLoc = result["min_thirty_day_net_per_loc"];
    var upperRevPerLoc = result["upperQuartile_thirty_day_net_per_loc"];
    var lowerRevPerLoc = result["lowerQuartile_thirty_day_net_per_loc"];

    var meanUnits = result["mean_thirty_day_units"];
    var medianUnits = result["median_thirty_day_units"];
    var maxUnits = result["max_thirty_day_units"];
    var minUnits = result["min_thirty_day_units"];
    var upperUnits = result["upperQuartile_thirty_day_units"];
    var lowerUnits = result["lowerQuartile_thirty_day_units"];

    var medianUnitsPerLoc = result["median_thirty_day_units_per_loc"];
    var maxUnitsPerLoc = result["max_thirty_day_units_per_loc"];
    var minUnitsPerLoc = result["min_thirty_day_units_per_loc"];
    var upperUnitsPerLoc = result["upperQuartile_thirty_day_units_per_loc"];
    var lowerUnitsPerLoc = result["lowerQuartile_thirty_day_units_per_loc"];

    console.log([totalScore, maxScore, minUnitsPerLoc, lowerUnitsPerLoc, medianUnitsPerLoc, upperUnitsPerLoc, maxUnitsPerLoc, totalLocs])


    var scoreBasedUnitsPrediction = predictUnits(totalScore, maxScore, minUnitsPerLoc, lowerUnitsPerLoc, medianUnitsPerLoc, upperUnitsPerLoc, maxUnitsPerLoc, totalLocs);

    var revPrediction = scoreBasedUnitsPrediction * price * wowcherFee/100
    
    var exampleDeals = result["deal_ids"];

    jQuery("#technicalMessaging").append("<div>Used method: "+type+"</div>");
    jQuery("#technicalMessaging").append("<div>Median 30 Day Net Rev: &pound"+round(medianRev,2)+"</div>");
    jQuery("#technicalMessaging").append("<div>Mean 30 Day Net Rev: &pound"+round(meanRev,2)+"</div>");

    renderResults(allMessaging, totalScore, maxScore,  minUnitsPerLoc, lowerUnitsPerLoc, medianUnitsPerLoc, upperUnitsPerLoc, maxUnitsPerLoc, revPrediction, scoreBasedUnitsPrediction, exampleDeals, totalLocs, price, wowcherFee);

}


function scoreVsAverage(value, lowerQuartile, median, upperQuartile, scoreCoeff, varName) {

    if ( value >= upperQuartile ) {

        if ( scoreCoeff > 0 ) {

            return [Math.abs(scoreCoeff*3), varName+" above Upper Quartile Value, maximum score achieved.",0,0,0]
        }
        else {

            return [0, varName+" above Upper Quartile Value, minimum score achieved. Reach a value below <b>"+upperQuartile+"</b> to remove this penalty.",Math.abs(scoreCoeff*3),Math.abs(scoreCoeff)*2,upperQuartile]
        }
            
    }
    else if ( value <= lowerQuartile ) {

        if ( scoreCoeff > 0 ) {

            return [0, varName+" below Lower Quartile Value, minimum score achieved. Reach a value above <b>"+lowerQuartile+"</b> to remove this penalty.",Math.abs(scoreCoeff*3),Math.abs(scoreCoeff)*2,lowerQuartile]
        }
        else {

            return [Math.abs(scoreCoeff)*3, varName+" below Lower Quartile Value, maximum score achieved.",0,0,0]
        }

    }
    else {

        if ( scoreCoeff > 0 ) {

            return [Math.abs(scoreCoeff)*2, varName+" between Lower Quartile Value and Upper Quartile Value, average score achieved. Reach a value above <b>"+upperQuartile+"</b> to maximise score.",Math.abs(scoreCoeff),Math.abs(scoreCoeff)*1, upperQuartile]
        }
        else {

            return [Math.abs(scoreCoeff)*2, varName+" between Lower Quartile Value and Upper Quartile Value, average score achieved. Reach a value below <b>"+lowerQuartile+"</b> to maximise score.",Math.abs(scoreCoeff),Math.abs(scoreCoeff)*1, lowerQuartile]
        }

    }


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

function round(num, dp) {

    let factor = Math.pow(10, dp);
    let roundedNum = Math.round(num * factor) / factor;
    
    return roundedNum.toFixed(dp);
}

function predictUnits(score, maxScore, minUnits, lowerQuartileUnits, medianUnits, upperQuartileUnits, maxUnits, totalLocs) {

    // Normalize the score
    const normalizedScore = score / maxScore;

    // Determine which revenue range the normalized score falls into
    let predictedUnits;

    if (normalizedScore <= 1/3) {
        // Interpolate between minRevenue and lowerQuartileRevenue
        const fraction = normalizedScore / (1/3);
        predictedUnits = minUnits + fraction * (lowerQuartileUnits - minUnits);
    } else if (normalizedScore <= 2/3) {
        // Interpolate between lowerQuartileRevenue and medianRevenue
        const fraction = (normalizedScore - 1/3) / (1/3);
        predictedUnits = lowerQuartileUnits + fraction * (medianUnits - lowerQuartileUnits);
    } else if (normalizedScore <= 1) {
        // Interpolate between medianRevenue and upperQuartileRevenue
        const fraction = (normalizedScore - 2/3) / (1/3);
        predictedUnits = medianUnits + fraction * (upperQuartileUnits - medianUnits);
    } else {
        // Cap the score at maxScore, just in case it's over
        predictedUnits = maxUnits;
    }

    predictedUnits = predictedUnits * totalLocs;

    return predictedUnits;
}

function parseDealIds(dealString) {
    const pairs = dealString.split('|');

    let table = '<table border="1">';
    table += '<tr><th>Deal ID</th><th>30 Day Net Revenue</th></tr>';

    pairs.forEach(pair => {
        var [deal_id, thirtyDayNet] = pair.split(':');

        deal_id = Math.round(deal_id);

        table += `<tr><td>${deal_id}</td><td>${thirtyDayNet}</td></tr>`;
    });

    table += '</table>';

    return table;
}


function renderResults(allMessaging, totalScore, maxScore, minRevenue, lowerQuartileRevenue, medianRevenue, upperQuartileRevenue, maxRevenue, revPrediction, unitsPrediction, exampleDeals, totalLocs, price, fee) {

    jQuery("#messaging").empty();
    jQuery("#finalScore").empty();
    jQuery("#predictedRev").empty();
    jQuery("#exampleDeals").empty();

    var sortedArray = allMessaging.sort((a, b) => b[2] - a[2]);

    for (i=0; i<sortedArray.length; i++) {

        var priceToUse = price;


        if ( sortedArray[i][4] == "price" ) {

            priceToUse = sortedArray[i][5];

        }

        var upliftUnits =  predictUnits(totalScore+sortedArray[i][3], maxScore, minRevenue, lowerQuartileRevenue, medianRevenue, upperQuartileRevenue, maxRevenue, totalLocs) - unitsPrediction;

        var upliftRev =  (priceToUse * (fee/100) * predictUnits(totalScore+sortedArray[i][3], maxScore, minRevenue, lowerQuartileRevenue, medianRevenue, upperQuartileRevenue, maxRevenue, totalLocs)) - revPrediction;

        var upliftSentence = "";

        if ( upliftUnits > 0 ) {

            upliftSentence = '  This would increase predicted units by <b>'+round(upliftUnits,2)+'</b>, and predicted net revenue by <b>&pound'+round(upliftRev,2)+'</b>.';

        }

        jQuery("#messaging").append('<div style="border: black; border-radius: 1px; border-style: solid;padding: 4px; text-align: center; background-color:'+getPastelColor(sortedArray[i][2],6)+';width:100%;">'+sortedArray[i][1]+upliftSentence+'</div>');

    }

    jQuery("#finalScore").append('<div>Final Customer Interest Score: <span style="font-weight:bold">'+totalScore+'/'+maxScore+'</span></div>');

    jQuery("#predictedRev").append('<div>30 Day Predicted Units: <span style="font-weight:bold">'+round(unitsPrediction,2)+'</span></div>');

    jQuery("#predictedRev").append('<div>30 Day Predicted Net Revenue: <span style="font-weight:bold">&pound'+round(revPrediction,2)+'</span></div>');

    const htmlTable = parseDealIds(exampleDeals);

    document.getElementById('exampleDeals').innerHTML = htmlTable;

}
