$( document ).ready(function() {
  const DATA_URL = 'https://proxy.hxlstandard.org/data.objects.json?tagger-match-all=on&tagger-01-header=date&tagger-01-tag=%23date&tagger-02-header=category&tagger-02-tag=%23category&tagger-03-header=country&tagger-03-tag=%23country%2Bcode%2Bv_iso2&tagger-04-header=metric&tagger-04-tag=%23metric&tagger-05-header=percentage&tagger-05-tag=%23percentage&tagger-06-header=subcategory+count&tagger-06-tag=%23subcategory%2Bcount&tagger-07-header=dataset+count&tagger-07-tag=%23dataset%2Bcount&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vTnZMN1guJCB44f-O6iP-JpNum4NJdL5Op5GEbrkAayk_V19UkmO56YzQ2vSsfVCVWl5eyOT-Yhh4Y-%2Fpub%3Fgid%3D1103779481%26single%3Dtrue%26output%3Dcsv&header-row=1&dest=data_view';//https://proxy.hxlstandard.org/data.objects.json?dest=data_view&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1MnsOt9qrsgFmBakkEipXgElJze4B3CYUG36IB5zIdiE%2Fedit%3Fusp';
  var isMobile = $(window).width()<600? true : false;
  var countryCount, categoryCount, rowCount = 0;
  var date;
  var metricColors = {data1: '#007CE1', data2: '#C0D7EB', data3: '#E6E7E8'};
  var metricNames = {data1: 'Complete', data2: 'Incomplete', data3: 'No data'}

  function getData() {
    loadData(DATA_URL, function (responseText) {
      parseData(JSON.parse(responseText));
    });
  }

  function loadData(dataPath, done) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () { return done(this.responseText) }
    xhr.open('GET', dataPath, true);
    xhr.send();
  }

  function parseData(data) {
    var format = d3.timeFormat("%b %d, %Y");
    var d = (data[0]['#date']).split('-');
    d = new Date(d[0], d[1]-1, d[2]);
    date = format(d);

    //group the data by category
    var groupByCategory = d3.nest()
      .key(function(d){ return d['#category']; })
      .entries(data);
    categoryCount = groupByCategory.length;
    groupByCategory.sort(compare);
    groupByCategory.push({key:'TOTAL'});

    //group the data by country
    var groupByCountry = d3.nest()
      .key(function(d) { return d['#country+code+v_iso2']; })
      .key(function(d) { return d['#metric']; })
      .key(function(d) { return d['#category']; })
      .rollup(function(v) { return v[0]['#percentage']; })
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
      $('.charts').append("<div class='col-2 country-chart'><div class='chart-header'><img src='assets/flags/__afghanistan.png'/><div>"+country.key+"<span>22 datasets</span></div></div><div class='chart " + chartName + "'></div></div>");
      
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