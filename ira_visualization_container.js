
document.getElementById('selector_state').addEventListener('click', function() {
    document.getElementById('selector_state').style.borderColor = "#aaa";
    document.getElementById('selector_district').style.borderColor = "white";
    document.getElementById('ira_visualization_iframe').src = "ira_visualization_state.html";
});


document.getElementById('selector_district').onclick = function() {
    document.getElementById('selector_state').style.borderColor = "white";
    document.getElementById('selector_district').style.borderColor = "#aaa";
    document.getElementById('ira_visualization_iframe').src = "ira_visualization.html";
}
