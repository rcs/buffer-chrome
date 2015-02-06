'use strict';
/* global chrome */

// Will be used to hold the timeout for updates.
var badgeUpdateTimeout;

// Fire off a request to profiles.json to find the minimum number of pending on
// the default profiles
//
// @param {function(error, minRemaining)} callback that takes a possible error
//        or the minRemaining of the profiles
function getMinPending(cb) {
  $.getJSON('https://bufferapp.com/api/1/profiles.json')
    .done(function( data/*, textStatus, jqXHR*/ ) {
      var pendingCounts = [];

      data.forEach(function(profile) {
        if( profile.default && profile.counts ) {
          pendingCounts.push(profile.counts.pending);
        }
      });

      if( pendingCounts.length > 0 ) {
        cb(null,Math.min(pendingCounts));
      }
      else {
        cb(null, NaN);
      }
    })
    .fail(function( jqXHR, textStatus, errorThrown ) {
      cb(errorThrown);
    });
}

// Fire off a request to the api to get the minimum pending, and update the
// badge text and styles based on the count.
//
// If pending-badge option is false, bail out and check again for an enabled
// option in 60s
function updatePendingBadge() {
  clearTimeout(badgeUpdateTimeout);

  if( localStorage.getItem('buffer.op.pending-badge') !== 'pending-badge' ) {
    chrome.browserAction.setBadgeBackgroundColor({color: '#76b852'});
    chrome.browserAction.setBadgeText({text: ''});
    badgeUpdateTimeout = setTimeout(updatePendingBadge, 60000);
    return;
  }

  var badgeStyles = [
    {min: 11, color: '#76b852', override: '10+'},
    {min: 8,  color: '#76b852'},
    {min: 5,  color: '#000000'},
    {min: 1,  color: '#ee4f4f'},
    {min: 0,  color: '#ee4f4f', override: '0!'}
  ];
  getMinPending(function(error,minRemaining){
    // If we got an error, or don't have a numeric response (maybe no profiles),
    // clear the badge text
    if( error || isNaN(minRemaining)) {
      chrome.browserAction.setBadgeBackgroundColor({color: '#76b852'});
      chrome.browserAction.setBadgeText({text: ''});
    }
    else {
      var selectedStyle = $.grep(badgeStyles, function(style) {
        return style.min <= minRemaining;
      })[0];

      chrome.browserAction.setBadgeBackgroundColor({color: selectedStyle.color});
      if( selectedStyle.override ) {
        chrome.browserAction.setBadgeText({text: selectedStyle.override});
      } else {
        chrome.browserAction.setBadgeText({text: minRemaining.toString()});
      }
    }
    // Fire again after a minute
    setTimeout(updatePendingBadge, 60000);
  });
}

// Set an initial fetch at 5s after load
badgeUpdateTimeout = setTimeout(updatePendingBadge, 5000);
