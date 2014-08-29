/*
 * ComunioPlusPlus DE
 *
 * Copyright (c) 2012, Florian Schäfer <florian.schaefer@gmail.com>
 * All rights reserved
 *
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 *
 */

function normalizeName(name) {
    return name.match(/(?:\w\.\s)?(\w*)/)[1];
}

function get(urls, done, fail) {
    var done = done || $.noop,
        fail = fail || $.noop,
        responses = {},
        requests = urls.map(function (url, i) {
            return $.get(url, function (response) { responses[i] = response });
        });

    function makeArray(obj) {
        var result = [];
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                result[prop] = obj[prop];
            }
        }
        return result;
    }

    $.when.apply(null, requests)
    .done(function () {
        done(makeArray(responses));
    })
    .fail(function () {
        fail();
    });
}

function addInjury($targetTr, data, name, club, done) {
    var done = done || $.noop,
        tr = $(data).find('td:contains("' + name + '"):first').closest('tr'),
        $tr = $(tr),
        injured = !!( $tr.find('td img[title="' + club + '"]').length ),
        injury = $tr.find('>td:eq(4)').text(),
        until = $tr.find('>td:eq(6)').text(),

        $td = $('<td/>', { 'align': 'center', 'css': { 'width': '24px' } }).appendTo($targetTr);

    if (injured) {
        $('<img/>', {
            'src': chrome.extension.getURL('/images/redcross.gif'),
            'title': injury + ' - ' + until,
            'css': {
                'heigth': '16px',
                'width': '16px'
            }
        })
        .appendTo($td);
    }
    
    done();
}

function addStats($targetTr, name, club) {
    get([
        'http://stats.comunio.de/search.php?name=' + name
    ], function (data) {
        var $tr = $(data[0]).find('table tr td a:contains("' + name + '")').closest('tr').find('img[title="' + club + '"]').closest('tr'),
            $img = $tr.find('td img.trend').clone(),
            $td = $('<td/>', { 'align': 'center', 'css': { 'width': '24px' } }).appendTo($targetTr);
        $img.css({
            'background-image': "url(" + chrome.extension.getURL('/images/trends.png') + ")"
        })
        .appendTo($td);
    });
}

function forEachPlayer(callback) {
    $([
        '.tablebox tr'          /* player table in lineup.html */
      , '.tablecontent03 tr'    /* player table in exchangemarket.phtml */
    ].join(','))
    .each(function () {
        var $tr = $(this),
            name = $(this).find('td:eq(0)').text().replace(/[\*\s]/g, ""),    /* player name */
            club = $(this).find('span.clubimg').attr("title");    /* club name */
			console.log("name"+name);
			console.log("club"+club);
        callback($tr, name, club);
    });
}

function formatNumber(number) {
    var number = number + '',
        x = number.split('.'),
        x1 = x[0],
        x2 = x.length > 1 ? '.' + x[1] : '',
            regexp = /(\d+)(\d{3})/;
    while (regexp.test(x1)) {
        x1 = x1.replace(regexp, '$1' + '.' + '$2');
    }
    return x1 + x2;
}

function normalizeNumber(number) {
    return parseInt(number.split('.').join(''));
}

function calculateBids() {
    var bids = 0;
    $('.tablecontent03 input[onkeyup]').each(function () {
        var value = $(this).val();
            
        if (value) {
            bids += normalizeNumber(value);
        }
    });
    return bids;
}

function getBudget() {
    return normalizeNumber($('#userbudget').text().match(/[?\.\d]+/)[0]);
}

function doCalculation() {
    var $calculation = $('#calculation');
    if ($calculation.length === 0) {
        $calculation = $('#title').clone().attr('id', 'calculation').addClass('contenttext').empty().insertAfter('#title');
    }

    var budget = getBudget(),
        bids = calculateBids(),
        newBalance = budget - bids;
        
    $calculation.html([
        '<p>' + formatNumber(budget) + '</p>'
      , '<p>-' + formatNumber(bids) + '</p>'
      , '<p>=' + formatNumber(newBalance) + '</p>'
    ].join(''));
}

var currentLocation = document.location.href;

if ( currentLocation.match("http://www.comunio.de/lineup.phtml")
  || currentLocation.match("http://www.comunio.de/exchangemarket.phtml") ) {
	  
    get([
        'http://www.transfermarkt.de/1-bundesliga/verletztespieler/wettbewerb/L1'
    ], function (injuryData) {
        forEachPlayer(function ($tr, name, club) {
            addInjury($tr, injuryData[0], normalizeName(name), club, function () {
                addStats($tr, name, club);
            });
        });
    });

}

if (currentLocation.match("http://www.comunio.de/exchangemarket.phtml")) {

    doCalculation();
    
    $('.tablecontent03 input[onkeyup]')
    .on('keyup, click, blur', function () {
        doCalculation();
    });

}

