$( document ).ready(function() {
  const DATA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnZMN1guJCB44f-O6iP-JpNum4NJdL5Op5GEbrkAayk_V19UkmO56YzQ2vSsfVCVWl5eyOT-Yhh4Y-/pub?gid=1103779481&single=true&output=csv';
  const DATA_DATA_COUNTS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnZMN1guJCB44f-O6iP-JpNum4NJdL5Op5GEbrkAayk_V19UkmO56YzQ2vSsfVCVWl5eyOT-Yhh4Y-/pub?gid=733089483&single=true&output=csv';
  const DATA_COUNTRY_NAMES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTnZMN1guJCB44f-O6iP-JpNum4NJdL5Op5GEbrkAayk_V19UkmO56YzQ2vSsfVCVWl5eyOT-Yhh4Y-/pub?gid=735983640&single=true&output=csv';
  

  var isMobile = $(window).width()<600? true : false;
  var countryCount, categoryCount, rowCount = 0;
  var date;
  var metricColors = {data1: '#007CE1', data2: '#C0D7EB', data3: '#E6E7E8'};
  var metricNames = {data1: 'Complete', data2: 'Incomplete', data3: 'No data'}
  var countryNames, datasetCounts = [];

  function getData() {
    Promise.all([
      d3.csv(DATA),
      d3.csv(DATA_DATA_COUNTS),
      d3.csv(DATA_COUNTRY_NAMES)
    ]).then(function(data){
      countryNames = data[2];
      datasetCounts = data[1];
      parseData(data[0]);
    });
  }

  function parseData(data) {
    var format = d3.timeFormat("%b %d, %Y");
    var d = (data[0]['Date']).split('-');
    d = new Date(d[0], d[1]-1, d[2]);
    date = format(d);

    //group the data by category
    var groupByCategory = d3.nest()
      .key(function(d){ return d['Category']; })
      .entries(data);
    categoryCount = groupByCategory.length;
    groupByCategory.sort(compare);
    groupByCategory.push({key:'TOTAL'});

    //group the data by country
    var groupByCountry = d3.nest()
      .key(function(d) { return d['ISO3']; })
      .key(function(d) { return d['Metric']; })
      .key(function(d) { return d['Category']; })
      .rollup(function(v) { return v[0]['Percentage']; })
      .entries(data);
    countryCount = groupByCountry.length;

    //generate charts
    generateCharts(groupByCategory, groupByCountry);
  }


  function generateCharts(categories, countries) {
    var chartName, chartData;
    var count = 0;
    var totals = {
      Complete: [],
      Incomplete: [],
      Empty: [],
    };
    countries.forEach(function(country) {
      //display categories in 1st column of every row
      count = (count==3) ? 0 : count+1;
      if (count==1) createCategories(categories);

      //create chart markup for each country
      chartData = [];
      chartName = country.key + "Chart";
      var countryName = getCountryName(country.key);
      var datasetCount = getDatasetCount(country.key);
      $('.charts').append("<div class='col-2 country-chart'><div class='chart-header'><img src='assets/flags/__" + country.key + ".png'/><div>" + countryName + "<span>" + datasetCount + " datasets</span></div></div><div class='chart " + chartName + "'></div></div>");
      
      //metric 
      country.values.forEach(function(metric, index) {
        metric.values.sort(compare);
        var values = ['data'+(index+1)];
        //category
        metric.values.forEach(function(category) {
          values.push(Math.round(category.value*100));
        });
        //mean
        var mean = Math.round(d3.mean(values));
        totals[metric.key].push(mean)
        values.push(mean);
        chartData.push(values);
      });
      createBarChart(chartName, chartData);
    });

    createOverview(totals);
  }


  function createOverview(totals) {
    //donut chart
    totals['Complete'] = Math.round(d3.mean(totals['Complete']));
    totals['Incomplete'] = Math.round(d3.mean(totals['Incomplete']));
    totals['Empty'] = Math.round(d3.mean(totals['Empty']));
    var metricTotals = Object.entries(totals);

    var chart = c3.generate({
      size: {
        height: 210
      },
      bindto: '.donut-chart',
      data: {
        columns: [
            ['data1', totals['Complete']],
            ['data2', totals['Incomplete']],
            ['data3', totals['Empty']]
        ],
        type: 'donut',
        names: metricNames,
        colors: metricColors,
        order: null
      },
      donut: {
        width: 45,
        label: {
          format: function (value, ratio, id) {
            return value+'%';
          }
        }
      }
    });

    var firstLegend = d3.select(".c3-legend-item");
    var legendContainer = d3.select(firstLegend.node().parentNode);
    var legendX = parseInt(firstLegend.select('text').attr('x'));
    var legendY = parseInt(firstLegend.select('text').attr('y'));
    legendContainer
      .attr('class', 'donut-legend-container')
      .append('text')
      .text('Global Data Grid Completeness:')
      .attr('class', 'donut-legend-title')
      .attr('x', legendX - 10)
      .attr('y', legendY - 20);

    //key figures
    metricTotals.forEach(function(metric, index) {
      var title = (metric[0] == 'Empty') ? 'Total Percentage No Data' : 'Total Percentage Data ' + metric[0];
      var value = metric[1] + '<span>%</span>';
      createKeyFigure(title, value);
    });


    createKeyFigure('Number of Locations', countryCount);
    createKeyFigure('Number of Categories', categoryCount);
    createKeyFigure('Number of Sub-categories', 0);
  }


  function createKeyFigure(title, value) {
    return $('.overview').append("<div class='key-figure col-3'><h3>"+ title +"</h3><div class='num'>"+ value +"</div><p class='date small'>"+ date +"</p></div></div>");
  }


  function createCategories(categories) {
    rowCount++;
    var icons = ['Affected-population', 'Coordination', 'Food-Security', 'Location', 'Health', 'People-in-need'];
    $('.charts').append("<div class='col-2 categories category-list" + rowCount + "'><ul class='small'></ul></div>");

    categories.forEach(function(category, index) {
      var cat = (category.key == 'Population & Socio-economic Indicators') ? 'Population & Socio-economy' : category.key;
      $('.category-list' + rowCount + ' ul').append("<li>" + cat + " <div><i class='humanitarianicons-" + icons[index] + "'></i></div></li>");
    });
  }


  function createBarChart(chartName, chartData) {
    var chart = c3.generate({
      size: {
        height: 200
      },
      bindto: '.' + chartName,
      data: {
        columns: chartData,
        names: metricNames,
        type: 'bar',
        labels: {
          format: function (v) {
            if (v>0)
              return v + '%';
          }
        },
        colors: metricColors,
        groups: [
            ['data1', 'data2', 'data3']
        ],
        order: null
      },
      bar: {
        width: 15
      },
      axis: {
        rotated: true,
        x: { show: false },
        y: {
          max: 100,
          min: 0,
          tick: {
            values: [0, 50, 100],
            outer: false
          },
          padding: {bottom: 0, top: 0}
        }
      },
      legend: {
        show: false
      },
      tooltip: {
        grouped: false,
        contents: function (d) {
          return '<div class="tooltip-custom">' + d[0].value + '% ' + (d[0].name).toLowerCase() +'</div>';
        }
      }
    });
  }



  function getCountryName(iso3) {
    const result = countryNames.filter(country => country['ISO-alpha3 code'] == iso3);
    return result[0]['M49 Country or Area'];
  }

  function getDatasetCount(iso3) {
    const result = datasetCounts.filter(country => country['Country'] == iso3);
    return result[0]['Unique Dataset Count'];
  }


  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = '';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});