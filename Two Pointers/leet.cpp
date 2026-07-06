#include <iostream>
#include <vector>
using namespace std;

bool twoSum(vector<int> &arr, int target)
{
    int n = arr.size();

    // Consider all pairs (arr[i], arr[j])
    for (int i = 0; i < n; i++)
    {
        for (int j = i + 1; j < n; j++)
        {

            // Check if the sum of the current pair
            // equals the target
            if (arr[i] + arr[j] == target)
            {
                return true;
            }
        }
    }

    // If no pair is found after checking all
    return false;
}

int main()
{
    vector<int> arr = {0, -1, 2, -3, 1};
    int target = 20;
    cout << ((twoSum(arr, target)) ? "true" : "false");
    return 0;
}